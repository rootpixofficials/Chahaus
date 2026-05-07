// Bluetooth Thermal Printer Library for Cha Haus
// UNIVERSAL TURBO PRINTING (Same Design & Speed for Laptop & Tablet)

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

// 🔥 UNIVERSAL TURBO CHUNK SENDER (High Speed for all devices)
const writeChunked = async (characteristic, data) => {
    // We use a safe chunk size but minimal delay for maximum speed
    const chunkSize = 128; 
    const delay = 3; // 3ms is the "Goldilocks" delay for both PC and Tablet stability
    
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        
        if (characteristic.properties.writeWithoutResponse) {
            await characteristic.writeValueWithoutResponse(chunk);
            await new Promise(r => setTimeout(r, delay));
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

// Optimized Image Processing (Fast for Tablet CPUs)
const canvasToESC_POS_Data = (canvas) => {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    
    const xBytes = Math.ceil(width / 8);
    const data = new Uint8Array(xBytes * height);
    const gray = new Uint8Array(width * height);

    // 1. Fast Grayscale + Alpha Handling
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const a = pixels[idx + 3];
        
        // If transparent, force white. Otherwise, do high-contrast gray.
        if (a < 10) {
            gray[i] = 255;
        } else {
            // High contrast conversion: (R+G+B)/3
            let lum = (r + g + b) / 3;
            gray[i] = lum < 200 ? 0 : 255; // Aggressive black/white for clarity
        }
    }

    // 2. Bit Packing (Skip Dithering for sharper text/logos)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (gray[y * width + x] === 0) {
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

// 🚀 STRIP-BY-STRIP PRINTING
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
        
        // Ensure pure white background (prevents gray splotches on tablet)
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, tempCanvas.height);
        
        ctx.fillStyle = 'black';
        ctx.textBaseline = 'top';
        ctx.imageSmoothingEnabled = false; // Keep it sharp

        // Use a consistent font stack across platforms
        const FONT_BOLD = "bold 36px 'Courier New', monospace";
        const FONT_NORMAL = "22px 'Courier New', monospace";
        const FONT_SMALL = "20px 'Courier New', monospace";

        // 1. LOGO
        const logoUrl = window.location.origin + "/Image/Cha_Haus_logo_final-removebg-preview.png";
        try {
            const img = await new Promise((resolve, reject) => {
                const i = new Image(); i.crossOrigin = "Anonymous";
                i.onload = () => resolve(i); i.onerror = reject; i.src = logoUrl;
            });
            const logoW = 280;
            const logoH = Math.round((img.height / img.width) * logoW);
            
            // Clear logo area to pure white again just in case
            ctx.fillStyle = 'white';
            ctx.fillRect((width - logoW) / 2, totalY, logoW, logoH);
            ctx.drawImage(img, (width - logoW) / 2, totalY, logoW, logoH);
            totalY += logoH + 10;
        } catch (e) {}

        // 2. HEADERS
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.font = FONT_BOLD;
        ctx.fillText('CHA HAUS', width / 2, totalY);
        totalY += 45;
        ctx.font = FONT_NORMAL;
        ctx.fillText('Tea & Snacks', width / 2, totalY);
        totalY += 35;

        const drawDivider = () => {
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(0, totalY); ctx.lineTo(width, totalY); ctx.stroke();
            totalY += 12; ctx.setLineDash([]);
        };
        drawDivider();
        totalY += 8;

        // 3. META
        ctx.textAlign = 'left';
        ctx.font = FONT_NORMAL;
        ctx.fillText(`No: ${receiptData.bill_number || ""}`, 0, totalY);
        totalY += 30;
        ctx.fillText(`Date: ${receiptData.date || ""}`, 0, totalY);
        totalY += 30;
        drawDivider();
        totalY += 8;

        // 4. ITEMS
        for (const item of (receiptData.items || [])) {
            ctx.textAlign = 'left';
            ctx.font = FONT_NORMAL;
            ctx.fillText(`${item.quantity} x ${item.name}`, 0, totalY);
            ctx.textAlign = 'right';
            ctx.fillText(`₹${parseFloat(item.subtotal || 0).toFixed(2)}`, width, totalY);
            totalY += 35;
        }
        drawDivider();
        totalY += 10;

        // 5. TOTAL
        ctx.textAlign = 'left';
        ctx.font = "bold 28px 'Courier New', monospace";
        ctx.fillText('TOTAL', 0, totalY);
        ctx.textAlign = 'right';
        ctx.fillText(`₹${parseFloat(receiptData.total || receiptData.total_amount || 0).toFixed(2)}`, width, totalY);
        totalY += 50;

        ctx.textAlign = 'center';
        ctx.font = FONT_SMALL;
        ctx.fillText('Thank you for visiting Cha Haus!', width / 2, totalY);
        totalY += 60;

        // 6. PRINT IN STRIPS
        const stripHeight = 150; 
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
    const html = `<html><body style="width: 384px; font-family: monospace; padding: 10px;"><center><img src="${logoUrl}" style="width: 250px;"><br><b style="font-size: 32px;">CHA HAUS</b><br>Tea & Snacks</center><hr><div style="font-size: 20px;">No: ${receiptData.bill_number || ""}<br>Date: ${receiptData.date || ""}</div><hr>${(receiptData.items || []).map(item => `<div style="display: flex; justify-content: space-between; font-size: 20px;"><span>${item.quantity} x ${item.name}</span><span>₹${parseFloat(item.subtotal || 0).toFixed(2)}</span></div>`).join('')}<hr><div style="display: flex; justify-content: space-between; font-size: 24px; font-weight: bold;"><span>TOTAL:</span><span>₹${parseFloat(receiptData.total || receiptData.total_amount || 0).toFixed(2)}</span></div><center><br>Thank you for visiting Cha Haus!</center></body></html>`;
    const safeBase64 = btoa(unescape(encodeURIComponent(html)));
    window.location.href = "rawbt:data:text/html;base64," + safeBase64;
};
