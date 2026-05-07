// Bluetooth Thermal Printer Library for Cha Haus
// V4: SUPER TURBO MODE (Optimized for Byju's Tab/Android)

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
    // 100 bytes is extremely safe and prevents the "Garbled Text" buffer overflow on Android
    const chunkSize = 100; 
    
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        
        if (characteristic.properties.writeWithoutResponse) {
            await characteristic.writeValueWithoutResponse(chunk);
            // Crucial: 10ms delay prevents the tablet from dropping bytes (which causes the random letters)
            await new Promise(r => setTimeout(r, 10)); 
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

const canvasToESC_POS_Data = (canvas) => {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    const xBytes = Math.ceil(width / 8);
    const data = new Uint8Array(xBytes * height);

    // Optimized loop for mobile CPUs
    for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i+3] > 128 && (pixels[i] + pixels[i+1] + pixels[i+2]) / 3 < 200) {
            const pixelIdx = i / 4;
            const y = Math.floor(pixelIdx / width);
            const x = pixelIdx % width;
            const byteIdx = y * xBytes + Math.floor(x / 8);
            data[byteIdx] |= (1 << (7 - (x % 8)));
        }
    }

    const command = new Uint8Array(8 + data.length);
    command.set([0x1D, 0x76, 0x30, 0, xBytes & 0xFF, (xBytes >> 8) & 0xFF, height & 0xFF, (height >> 8) & 0xFF]);
    command.set(data, 8);
    return command;
};

const drawReceiptCanvas = async (receiptData) => {
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

    // TOP PADDING: so the printer blade does not cut the logo
    totalY += 60; 

    // Universally bolder and larger fonts
    const FONT_REGULAR = "bold 24px 'Courier New', Courier, monospace"; 
    const FONT_TITLE = "900 38px 'Courier New', Courier, monospace";
    const FONT_TOTAL = "900 32px 'Courier New', Courier, monospace";
    const FONT_INSTA = "bold 24px 'Courier New', Courier, monospace";

    // 1. LOGO
    const logoUrl = window.location.origin + "/Image/Cha_Haus_logo_final-removebg-preview.png";
    try {
        const img = await new Promise((resolve, reject) => {
            const i = new Image(); i.crossOrigin = "Anonymous";
            i.onload = () => resolve(i); i.onerror = reject; i.src = logoUrl;
        });
        const logoW = 240; 
        const logoH = Math.round((img.height / img.width) * logoW);
        ctx.drawImage(img, (width - logoW) / 2, totalY, logoW, logoH);
        totalY += logoH + 50; // GAP BETWEEN LOGO AND CHA HAUS
    } catch (e) {}

    // 2. HEADERS
    ctx.textAlign = 'center';
    ctx.font = FONT_TITLE;
    ctx.fillText('CHA  HAUS', width / 2, totalY); 
    totalY += 50; // GAP BETWEEN CHA HAUS AND TEA & SNACKS
    ctx.font = FONT_REGULAR;
    ctx.fillText('Tea & Snacks', width / 2, totalY);
    totalY += 50; // GAP AFTER TEA & SNACKS

    // Helper functions for reliable printing with generous spacing
    const printLine = (text, align = 'left', font = FONT_REGULAR) => {
        ctx.font = font;
        ctx.textAlign = align;
        ctx.fillText(text, align === 'center' ? width/2 : 0, totalY);
        totalY += 36; // Generous space between lines
    };

    const printRow = (leftText, rightText, font = FONT_REGULAR) => {
        ctx.font = font;
        ctx.textAlign = 'left';
        
        let safeLeft = leftText;
        if (safeLeft.length > 18) {
            safeLeft = safeLeft.substring(0, 16) + '..';
        }

        ctx.fillText(safeLeft, 0, totalY);
        ctx.textAlign = 'right';
        ctx.fillText(rightText, width, totalY);
        totalY += 36; // Generous space between rows
    };

    const drawDashedLine = () => {
        totalY += 15; // GAP BEFORE LINE
        ctx.beginPath();
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 3; // REALLY BOLD DASHED LINE
        ctx.moveTo(0, totalY);
        ctx.lineTo(width, totalY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
        totalY += 25; // GAP AFTER LINE
    };

    drawDashedLine();

    // 3. META
    printLine(`No: ${receiptData.bill_number || ""}`);
    printLine(`Date: ${receiptData.date || ""}`);
    
    drawDashedLine();

    // 4. ITEMS
    for (const item of (receiptData.items || [])) {
        const left = `${item.quantity} x ${item.name}`;
        const right = `₹${parseFloat(item.subtotal || 0).toFixed(2)}`;
        printRow(left, right);
    }
    
    drawDashedLine();

    // 5. PAYMENT METHOD & TOTAL
    printRow('Payment Method', receiptData.payment_method || "Cash");
    
    totalY += 20; // Extra space before total
    printRow('TOTAL', `₹${parseFloat(receiptData.total || receiptData.total_amount || 0).toFixed(2)}`, FONT_TOTAL);
    totalY += 50; // Space after total

    // 6. FOOTER
    printLine('Thank you for visiting Cha Haus!', 'center');
    totalY += 40; // Space before Instagram

    // 7. INSTAGRAM ICON & TEXT
    const instaX = (width / 2) - 85; 
    const instaY = totalY - 2;
    const iconSize = 24; 
    const r = 6; 

    ctx.lineWidth = 2.5; // Bold Instagram icon
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.moveTo(instaX + r, instaY);
    ctx.lineTo(instaX + iconSize - r, instaY);
    ctx.quadraticCurveTo(instaX + iconSize, instaY, instaX + iconSize, instaY + r);
    ctx.lineTo(instaX + iconSize, instaY + iconSize - r);
    ctx.quadraticCurveTo(instaX + iconSize, instaY + iconSize, instaX + iconSize - r, instaY + iconSize);
    ctx.lineTo(instaX + r, instaY + iconSize);
    ctx.quadraticCurveTo(instaX, instaY + iconSize, instaX, instaY + iconSize - r);
    ctx.lineTo(instaX, instaY + r);
    ctx.quadraticCurveTo(instaX, instaY, instaX + r, instaY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(instaX + iconSize/2, instaY + iconSize/2, 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(instaX + iconSize - 6, instaY + 6, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.font = FONT_INSTA;
    ctx.fillText("@chahous.in", instaX + 38, totalY);

    // BOTTOM PADDING: so the printer blade doesn't cut the Instagram logo
    totalY += 100;

    // Crop canvas
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = width;
    finalCanvas.height = totalY;
    finalCanvas.getContext('2d').drawImage(tempCanvas, 0, 0, width, totalY, 0, 0, width, totalY);

    return finalCanvas;
};

// 🚀 STRIP-BY-STRIP PRINTING
export const printReceipt = async (characteristic, receiptData) => {
    try {
        if (!characteristic) throw new Error("Printer not connected");
        await characteristic.writeValue(CMD.INIT);

        const canvas = await drawReceiptCanvas(receiptData);
        
        const stripHeight = 200; // Larger strips for Byju's Tab CPU efficiency
        for (let currentY = 0; currentY < canvas.height; currentY += stripHeight) {
            const h = Math.min(stripHeight, canvas.height - currentY);
            const stripCanvas = document.createElement('canvas');
            stripCanvas.width = canvas.width;
            stripCanvas.height = h;
            stripCanvas.getContext('2d').drawImage(canvas, 0, currentY, canvas.width, h, 0, 0, canvas.width, h);
            
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
    try {
        const canvas = await drawReceiptCanvas(receiptData);

        // Convert the exact canvas to a PNG and send to RawBT instantly
        const dataUrl = canvas.toDataURL("image/png");
        const rawbtUrl = dataUrl.replace("data:", "rawbt:data:");
        window.location.href = rawbtUrl;
    } catch (err) {
        console.error("RawBT Canvas Print Error:", err);
    }
};
