// Bluetooth Thermal Printer Library for Cha Haus
// ULTRA-FAST DESIGN-PRESERVING PRINTING

export const connectPrinter = async () => {
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
        });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        const characteristics = await service.getCharacteristics();
        
        const writeCharacteristic = characteristics.find(char => 
            char.properties.write || char.properties.writeWithoutResponse
        );

        if (!writeCharacteristic) {
            throw new Error("Could not find a write-capable characteristic.");
        }

        return { characteristic: writeCharacteristic };
    } catch (error) {
        console.error("Bluetooth Connection Error:", error);
        throw error;
    }
};

// 🔥 TURBO CHUNK SENDER (Optimized for Throughput)
const writeChunked = async (characteristic, data) => {
    const chunkSize = 100; // Safe for MTU but faster than 20
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        
        // Use WithoutResponse if possible for 3x speed increase
        if (characteristic.properties.writeWithoutResponse) {
            await characteristic.writeValueWithoutResponse(chunk);
            // 2ms micro-delay to prevent buffer saturation
            await new Promise(r => setTimeout(r, 2));
        } else {
            await characteristic.writeValue(chunk);
        }
    }
};

const textEncode = (text) => {
    return new TextEncoder().encode(text);
};

const CMD = {
    INIT: new Uint8Array([0x1B, 0x40]),
    CUT: new Uint8Array([0x1D, 0x56, 66, 0])
};

// Helper to convert Canvas to ESC/POS Image Data
const canvasToESC_POS_Data = (canvas) => {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    
    const xBytes = Math.ceil(width / 8);
    const data = new Uint8Array(xBytes * height);
    const gray = new Float32Array(width * height);

    for (let i = 0; i < width * height; i++) {
        const a = pixels[i * 4 + 3];
        if (a < 128) {
            gray[i] = 255;
        } else {
            let lum = 0.299 * pixels[i * 4] + 0.587 * pixels[i * 4 + 1] + 0.114 * pixels[i * 4 + 2];
            if (lum < 240) lum = lum * 0.5;
            gray[i] = lum;
        }
    }

    // Floyd-Steinberg Dithering
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const oldPixel = gray[idx];
            const newPixel = oldPixel < 128 ? 0 : 255;
            gray[idx] = newPixel;
            const err = oldPixel - newPixel;
            if (x + 1 < width) gray[idx + 1] += err * 7 / 16;
            if (x - 1 >= 0 && y + 1 < height) gray[idx - 1 + width] += err * 3 / 16;
            if (y + 1 < height) gray[idx + width] += err * 5 / 16;
            if (x + 1 < width && y + 1 < height) gray[idx + 1 + width] += err * 1 / 16;
        }
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (gray[y * width + x] < 128) {
                const byteIdx = y * xBytes + Math.floor(x / 8);
                data[byteIdx] |= (1 << (7 - (x % 8)));
            }
        }
    }

    const command = new Uint8Array(8 + data.length);
    command.set([0x1D, 0x76, 0x30, 0, xBytes & 0xFF, (xBytes >> 8) & 0xFF, height & 0xFF, (height >> 8) & 0xFF]);
    command.set(data, 8);
    return command;
};

// 🚀 STRIP-BY-STRIP PRINTING (Extreme Speed + Instant Start)
export const printReceipt = async (characteristic, receiptData) => {
    try {
        if (!characteristic) throw new Error("Printer not connected");
        await characteristic.writeValue(CMD.INIT);

        const width = 384;
        let totalY = 0;

        // 1. Render entire receipt to a virtual canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = 3000;
        const ctx = tempCanvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, tempCanvas.height);
        ctx.fillStyle = 'black';
        ctx.textBaseline = 'top';

        // LOGO
        const logoUrl = window.location.origin + "/Image/Cha_Haus_logo_final-removebg-preview.png";
        try {
            const img = await new Promise((resolve, reject) => {
                const i = new Image(); i.crossOrigin = "Anonymous";
                i.onload = () => resolve(i); i.onerror = reject; i.src = logoUrl;
            });
            const logoW = 280;
            const logoH = Math.round((img.height / img.width) * logoW);
            ctx.drawImage(img, (width - logoW) / 2, totalY, logoW, logoH);
            totalY += logoH + 10;
        } catch (e) {}

        // HEADERS
        ctx.textAlign = 'center';
        ctx.font = 'bold 36px monospace';
        ctx.fillText('CHA HAUS', width / 2, totalY);
        totalY += 45;
        ctx.font = '22px monospace';
        ctx.fillText('Tea & Snacks', width / 2, totalY);
        totalY += 35;

        const drawDivider = () => {
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(0, totalY); ctx.lineTo(width, totalY); ctx.stroke();
            totalY += 12; ctx.setLineDash([]);
        };
        drawDivider();
        totalY += 8;

        // META
        ctx.textAlign = 'left';
        ctx.font = '22px monospace';
        ctx.fillText(`No: ${receiptData.bill_number || ""}`, 0, totalY);
        totalY += 30;
        ctx.fillText(`Date: ${receiptData.date || ""}`, 0, totalY);
        totalY += 30;
        drawDivider();
        totalY += 8;

        // ITEMS
        for (const item of (receiptData.items || [])) {
            ctx.textAlign = 'left';
            ctx.font = '22px monospace';
            ctx.fillText(`${item.quantity} x ${item.name}`, 0, totalY);
            ctx.textAlign = 'right';
            ctx.fillText(`₹${parseFloat(item.subtotal || 0).toFixed(2)}`, width, totalY);
            totalY += 35;
        }
        drawDivider();
        totalY += 10;

        // TOTAL
        ctx.textAlign = 'left';
        ctx.font = 'bold 28px monospace';
        ctx.fillText('TOTAL', 0, totalY);
        ctx.textAlign = 'right';
        ctx.fillText(`₹${parseFloat(receiptData.total || receiptData.total_amount || 0).toFixed(2)}`, width, totalY);
        totalY += 50;

        ctx.textAlign = 'center';
        ctx.font = '20px monospace';
        ctx.fillText('Thank you for visiting Cha Haus!', width / 2, totalY);
        totalY += 60;

        // 2. BREAK INTO STRIPS AND PRINT IMMEDIATELY
        const stripHeight = 120; // Small strips to start motor fast
        for (let currentY = 0; currentY < totalY; currentY += stripHeight) {
            const h = Math.min(stripHeight, totalY - currentY);
            const stripCanvas = document.createElement('canvas');
            stripCanvas.width = width;
            stripCanvas.height = h;
            stripCanvas.getContext('2d').drawImage(tempCanvas, 0, currentY, width, h, 0, 0, width, h);
            
            const escData = canvasToESC_POS_Data(stripCanvas);
            await writeChunked(characteristic, escData);
        }
        
        await writeChunked(characteristic, textEncode("\n\n\n"));
        await characteristic.writeValue(CMD.CUT);

    } catch (err) {
        console.error("Print Error:", err);
    }
};

export const printViaRawBT = async (receiptData) => {
    // ... RawBT logic stays same ...
    const logoUrl = window.location.origin + "/Image/Cha_Haus_logo_final-removebg-preview.png";
    const html = `<html><body style="width: 384px; font-family: monospace; padding: 10px;"><center><img src="${logoUrl}" style="width: 250px;"><br><b style="font-size: 32px;">CHA HAUS</b><br>Tea & Snacks</center><hr><div style="font-size: 20px;">No: ${receiptData.bill_number || ""}<br>Date: ${receiptData.date || ""}</div><hr>${(receiptData.items || []).map(item => `<div style="display: flex; justify-content: space-between; font-size: 20px;"><span>${item.quantity} x ${item.name}</span><span>₹${parseFloat(item.subtotal || 0).toFixed(2)}</span></div>`).join('')}<hr><div style="display: flex; justify-content: space-between; font-size: 24px; font-weight: bold;"><span>TOTAL:</span><span>₹${parseFloat(receiptData.total || receiptData.total_amount || 0).toFixed(2)}</span></div><center><br>Thank you for visiting Cha Haus!</center></body></html>`;
    const safeBase64 = btoa(unescape(encodeURIComponent(html)));
    window.location.href = "rawbt:data:text/html;base64," + safeBase64;
};
