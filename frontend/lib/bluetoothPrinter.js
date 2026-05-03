/**
 * Bluetooth Printer Utility (FIXED VERSION)
 * Stable ESC/POS implementation for Web Bluetooth
 */

export const connectPrinter = async () => {
    try {
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
        });

        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

        return { device, characteristic };
    } catch (error) {
        console.error("Bluetooth connection failed", error);
        throw error;
    }
};


// 🔥 SAFE CHUNK SENDER (IMPORTANT FIX)
const writeChunked = async (characteristic, data) => {
    const chunkSize = 512; // Increased for faster transmission
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await characteristic.writeValue(chunk);
    }
};


// Convert text safely
const textEncode = (text) => {
    return new TextEncoder().encode(text);
};


// ESC/POS Commands
const CMD = {
    INIT: new Uint8Array([0x1B, 0x40]),
    CENTER: new Uint8Array([0x1B, 0x61, 1]),
    LEFT: new Uint8Array([0x1B, 0x61, 0]),
    BOLD_ON: new Uint8Array([0x1B, 0x45, 1]),
    BOLD_OFF: new Uint8Array([0x1B, 0x45, 0]),
    CUT: new Uint8Array([0x1D, 0x56, 66, 0])
};


// Helper to convert any Canvas to ESC/POS image and print
const printCanvasESC_POS = async (canvas, characteristic) => {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    
    const xBytes = Math.ceil(width / 8);
    const dataLength = xBytes * height;
    const data = new Uint8Array(dataLength);

    const gray = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const r = pixels[i * 4];
        const g = pixels[i * 4 + 1];
        const b = pixels[i * 4 + 2];
        const a = pixels[i * 4 + 3];
        
        if (a < 128) {
            gray[i] = 255;
        } else {
            let lum = 0.299 * r + 0.587 * g + 0.114 * b;
            // Artificially darken the logo to make it stand out more
            // (but keep pure white backgrounds as white to avoid speckles)
            if (lum < 240) {
                lum = lum * 0.5; // Darken by 50%
            }
            gray[i] = lum;
        }
    }

    // Apply Floyd-Steinberg dithering to preserve logo details
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

    // Pack binary pixels into bytes
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (gray[idx] < 128) { // Black dot
                const byteIdx = y * xBytes + Math.floor(x / 8);
                const bitPos = 7 - (x % 8);
                data[byteIdx] |= (1 << bitPos);
            }
        }
    }
    
    const command = new Uint8Array(8 + dataLength);
    command[0] = 0x1D;
    command[1] = 0x76;
    command[2] = 0x30;
    command[3] = 0; // Normal mode
    command[4] = xBytes & 0xFF; // xL
    command[5] = (xBytes >> 8) & 0xFF; // xH
    command[6] = height & 0xFF; // yL
    command[7] = (height >> 8) & 0xFF; // yH
    command.set(data, 8);
    
    await characteristic.writeValue(CMD.CENTER);
    await writeChunked(characteristic, command);
};


// MAIN PRINT FUNCTION (FIXED FOR FULL IMAGE PRINTING)
export const printReceipt = async (characteristic, receiptData) => {
    try {
        await characteristic.writeValue(CMD.INIT);

        const width = 384; // Standard 58mm printer width
        let y = 0;

        // Use a very tall canvas, we will crop it down later
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = 2000; 
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, canvas.height);
        
        ctx.fillStyle = 'black';
        ctx.textBaseline = 'top';

        // Disable smoothing to prevent blurry logo blobs
        ctx.imageSmoothingEnabled = false;

        // Load Logo
        const logoUrl = window.location.origin + "/Image/Cha_Haus_logo_final-removebg-preview.png";
        try {
            const img = await new Promise((resolve, reject) => {
                const i = new Image();
                i.crossOrigin = "Anonymous";
                i.onload = () => resolve(i);
                i.onerror = reject;
                i.src = logoUrl;
            });
            const logoW = 320;
            const logoH = Math.round((img.height / img.width) * logoW);
            ctx.drawImage(img, (width - logoW) / 2, y, logoW, logoH);
            y += logoH + 15;
        } catch (e) {
            console.error("Failed to load logo", e);
        }

        // Headers
        ctx.textAlign = 'center';
        ctx.font = 'bold 36px monospace'; // Reduced from 44
        ctx.fillText('CHA HAUS', width / 2, y);
        y += 45; // Reduced from 55

        ctx.font = '22px monospace'; // Reduced from 26
        ctx.fillText('Tea & Snacks', width / 2, y);
        y += 35; // Reduced from 40

        // Divider Helper
        const drawDivider = () => {
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            y += 12; // Reduced from 15
            ctx.setLineDash([]);
        };

        drawDivider();
        y += 10;

        // Meta info
        ctx.textAlign = 'left';
        ctx.font = '20px monospace'; // Reduced from 24
        ctx.fillText(`No: ${receiptData.bill_number || ""}`, 0, y);
        y += 30; // Reduced from 35
        ctx.fillText(`Date: ${receiptData.date || ""}`, 0, y);
        y += 30; // Reduced from 35

        y += 10;
        drawDivider();
        y += 10;

        // Items
        for (const item of (receiptData.items || [])) {
            ctx.textAlign = 'left';
            ctx.font = '20px monospace'; // Reduced from 24
            ctx.fillText(`${item.quantity} x ${item.name}`, 0, y);
            ctx.textAlign = 'right';
            const price = parseFloat(item.subtotal || 0).toFixed(2);
            ctx.fillText(`₹${price}`, width, y);
            y += 35; // Reduced from 40
        }

        y += 8;
        drawDivider();
        y += 12;

        // Payment
        ctx.textAlign = 'left';
        ctx.font = '20px monospace'; // Reduced from 24
        ctx.fillText('Payment Method', 0, y);
        ctx.textAlign = 'right';
        ctx.fillText(`${receiptData.payment_method || "Cash"}`, width, y);
        y += 40; // Reduced from 45

        // Total
        ctx.font = 'bold 28px monospace'; // Reduced from 32
        ctx.textAlign = 'left';
        ctx.fillText('TOTAL', 0, y);
        ctx.textAlign = 'right';
        const total = parseFloat(receiptData.total || receiptData.total_amount || 0).toFixed(2);
        ctx.fillText(`₹${total}`, width, y);
        y += 50; // Reduced from 60

        // Footer
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Thank you for visiting Cha Haus!', width / 2, y);
        y += 50; // Reduced from 60

        // Crop to the final used height
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = width;
        finalCanvas.height = y;
        const fCtx = finalCanvas.getContext('2d');
        fCtx.drawImage(canvas, 0, 0);

        // Convert exactly the drawn layout to POS Image and print it
        await printCanvasESC_POS(finalCanvas, characteristic);
        
        // Feed paper slightly and cut
        await characteristic.writeValue(CMD.CENTER);
        await writeChunked(characteristic, textEncode("\n\n\n"));
        await characteristic.writeValue(CMD.CUT);

    } catch (err) {
        console.error("Print failed:", err);
    }
};

// Helper to convert image URL to Base64
const getBase64ImageFromUrl = async (imageUrl) => {
    try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Failed to fetch image for printing", e);
        return "";
    }
};

// Alternative for Android RawBT Intent using HTML for Exact Design
export const printViaRawBT = async (receiptData) => {
    // Get absolute URL for the logo so the printer can fetch it
    const logoUrl = window.location.origin + "/Image/Cha_Haus_logo_final-removebg-preview.png";
    
    // Fetch and convert logo to Base64 so RawBT can render it without network issues
    const base64Logo = await getBase64ImageFromUrl(logoUrl);

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: monospace; color: black; background: white; width: 100%; max-width: 380px; margin: 0; padding: 10px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed black; margin: 10px 0; }
            .flex-between { display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 4px 0; font-size: 14px; }
            .right { text-align: right; }
        </style>
    </head>
    <body>
        <div class="center">
            ${base64Logo ? `<img src="${base64Logo}" style="width:100px; height:auto; margin-bottom:5px; filter: grayscale(100%);" />` : ''}
            <h2 style="margin:5px 0;">CHA HAUS</h2>
            <div style="font-size:12px;">Tea & Snacks</div>
        </div>
        
        <div class="divider"></div>
        
        <div style="font-size:12px; margin-bottom:10px;">
            <div>No: ${receiptData.bill_number || ""}</div>
            <div>Date: ${receiptData.date || ""}</div>
        </div>
        
        <div class="divider"></div>
        
        <table>
            ${(receiptData.items || []).map(item => `
                <tr>
                    <td>${item.quantity} x ${item.name}</td>
                    <td class="right">Rs ${item.subtotal}</td>
                </tr>
            `).join('')}
        </table>
        
        <div class="divider"></div>
        
        <div class="flex-between" style="font-size: 14px;">
            <span>Payment Method</span>
            <span>${receiptData.payment_method || "Cash"}</span>
        </div>
        
        <div class="flex-between bold" style="font-size:18px; margin-top:8px;">
            <span>TOTAL</span>
            <span>Rs ${receiptData.total || 0}</span>
        </div>
        
        <div class="center" style="margin-top:20px; font-size:12px;">
            Thank you for visiting Cha Haus!<br><br><br>
        </div>
    </body>
    </html>
    `;

    // Encode HTML to Base64
    const safeBase64 = btoa(unescape(encodeURIComponent(html)));
    // Send to RawBT using HTML schema
    const url = "rawbt:data:text/html;base64," + safeBase64;

    window.location.href = url;
};
