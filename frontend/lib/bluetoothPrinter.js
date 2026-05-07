// Bluetooth Thermal Printer Library for Cha Haus
// V3: COMPACT DESIGN + TABLET SPEED FIX

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

        if (!writeCharacteristic) throw new Error("No write characteristic found.");
        return { characteristic: writeCharacteristic };
    } catch (error) {
        console.error("Bluetooth Connection Error:", error);
        throw error;
    }
};

// 🔥 FAST & STABLE CHUNK SENDER
const writeChunked = async (characteristic, data) => {
    // 120 bytes is the sweet spot for almost all Android tablets & Windows PCs
    const chunkSize = 120; 
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // For Tablet: We use a tiny delay. For Laptop: No delay.
    const delay = isMobile ? 5 : 0; 

    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        
        if (characteristic.properties.writeWithoutResponse) {
            await characteristic.writeValueWithoutResponse(chunk);
            if (delay > 0) await new Promise(r => setTimeout(r, delay));
        } else {
            // Fallback for devices that don't support WithoutResponse
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

const canvasToESC_POS_Data = (canvas) => {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    const xBytes = Math.ceil(width / 8);
    const data = new Uint8Array(xBytes * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = pixels[idx];
            const g = pixels[idx+1];
            const b = pixels[idx+2];
            const a = pixels[idx+3];
            
            // Force High Contrast (Pure Black or Pure White)
            if (a > 128 && (r + g + b) / 3 < 200) {
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

// 🚀 STRIP-BY-STRIP PRINTING (Smaller Fonts)
export const printReceipt = async (characteristic, receiptData) => {
    try {
        if (!characteristic) throw new Error("Printer not connected");
        await characteristic.writeValue(CMD.INIT);

        const width = 384;
        let totalY = 0;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = 3000;
        const ctx = tempCanvas.getContext('2d');
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, tempCanvas.height);
        ctx.fillStyle = 'black';
        ctx.textBaseline = 'top';
        ctx.imageSmoothingEnabled = false;

        // --- NEW COMPACT FONT SIZES ---
        const FONT_BOLD = "bold 30px 'Courier New', monospace";
        const FONT_NORMAL = "18px 'Courier New', monospace";
        const FONT_SMALL = "16px 'Courier New', monospace";

        // 1. LOGO
        const logoUrl = window.location.origin + "/Image/Cha_Haus_logo_final-removebg-preview.png";
        try {
            const img = await new Promise((resolve, reject) => {
                const i = new Image(); i.crossOrigin = "Anonymous";
                i.onload = () => resolve(i); i.onerror = reject; i.src = logoUrl;
            });
            const logoW = 240; // Smaller logo for speed
            const logoH = Math.round((img.height / img.width) * logoW);
            ctx.drawImage(img, (width - logoW) / 2, totalY, logoW, logoH);
            totalY += logoH + 10;
        } catch (e) {}

        // 2. HEADERS
        ctx.textAlign = 'center';
        ctx.font = FONT_BOLD;
        ctx.fillText('CHA HAUS', width / 2, totalY);
        totalY += 40;
        ctx.font = FONT_NORMAL;
        ctx.fillText('Tea & Snacks', width / 2, totalY);
        totalY += 30;

        const drawDivider = () => {
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(0, totalY); ctx.lineTo(width, totalY); ctx.stroke();
            totalY += 10; ctx.setLineDash([]);
        };
        drawDivider();
        totalY += 5;

        // 3. META
        ctx.textAlign = 'left';
        ctx.font = FONT_NORMAL;
        ctx.fillText(`No: ${receiptData.bill_number || ""}`, 0, totalY);
        totalY += 25;
        ctx.fillText(`Date: ${receiptData.date || ""}`, 0, totalY);
        totalY += 25;
        drawDivider();
        totalY += 5;

        // 4. ITEMS
        for (const item of (receiptData.items || [])) {
            ctx.textAlign = 'left';
            ctx.font = FONT_NORMAL;
            ctx.fillText(`${item.quantity} x ${item.name}`, 0, totalY);
            ctx.textAlign = 'right';
            ctx.fillText(`₹${parseFloat(item.subtotal || 0).toFixed(2)}`, width, totalY);
            totalY += 30;
        }
        drawDivider();
        totalY += 10;

        // 5. TOTAL
        ctx.textAlign = 'left';
        ctx.font = "bold 24px 'Courier New', monospace";
        ctx.fillText('TOTAL', 0, totalY);
        ctx.textAlign = 'right';
        ctx.fillText(`₹${parseFloat(receiptData.total || receiptData.total_amount || 0).toFixed(2)}`, width, totalY);
        totalY += 45;

        ctx.textAlign = 'center';
        ctx.font = FONT_SMALL;
        ctx.fillText('Thank you for visiting Cha Haus!', width / 2, totalY);
        totalY += 50;

        // 6. PRINT IN STRIPS
        const stripHeight = 100; // Smaller strips for faster start
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
    const logoUrl = window.location.origin + "/Image/Cha_Haus_logo_final-removebg-preview.png";
    const html = `<html><body style="width: 384px; font-family: monospace; padding: 10px;"><center><img src="${logoUrl}" style="width: 250px;"><br><b style="font-size: 32px;">CHA HAUS</b><br>Tea & Snacks</center><hr><div style="font-size: 18px;">No: ${receiptData.bill_number || ""}<br>Date: ${receiptData.date || ""}</div><hr>${(receiptData.items || []).map(item => `<div style="display: flex; justify-content: space-between; font-size: 18px;"><span>${item.quantity} x ${item.name}</span><span>₹${parseFloat(item.subtotal || 0).toFixed(2)}</span></div>`).join('')}<hr><div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold;"><span>TOTAL:</span><span>₹${parseFloat(receiptData.total || receiptData.total_amount || 0).toFixed(2)}</span></div><center><br>Thank you for visiting Cha Haus!</center></body></html>`;
    const safeBase64 = btoa(unescape(encodeURIComponent(html)));
    window.location.href = "rawbt:data:text/html;base64," + safeBase64;
};
