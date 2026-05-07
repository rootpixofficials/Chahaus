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

    // ==========================================
    // 🔥 NEW CLEAN PROFESSIONAL RECEIPT DESIGN
    // Matches the provided image layout
    // ==========================================

    const width = 384;
    let totalY = 0;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = 3000;

    const ctx = tempCanvas.getContext('2d');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, tempCanvas.height);

    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';
    ctx.imageSmoothingEnabled = true;

    // Fonts
    const FONT_TITLE = "bold 30px 'Courier New', monospace";
    const FONT_SUBTITLE = "24px 'Courier New', monospace";
    const FONT_NORMAL = "24px 'Courier New', monospace";
    const FONT_TOTAL = "bold 34px 'Courier New', monospace";
    const FONT_FOOTER = "22px 'Courier New', monospace";

    // ==========================================
    // TOP SPACE
    // ==========================================

    totalY += 40;

    // ==========================================
    // LOGO
    // ==========================================

    const logoUrl =
        window.location.origin +
        "/Image/Cha_Haus_logo_final-removebg-preview.png";

    try {
        const img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.crossOrigin = "Anonymous";
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = logoUrl;
        });

        const logoW = 110;
        const logoH = Math.round((img.height / img.width) * logoW);

        ctx.drawImage(
            img,
            (width - logoW) / 2,
            totalY,
            logoW,
            logoH
        );

        totalY += logoH + 35;

    } catch (e) {
        console.log("Logo load failed", e);
    }

    // ==========================================
    // TITLE
    // ==========================================

    ctx.textAlign = "center";

    ctx.font = FONT_TITLE;
    ctx.fillText("CHA HAUS", width / 2, totalY);

    totalY += 45;

    ctx.font = FONT_SUBTITLE;
    ctx.fillText("Tea & Snacks", width / 2, totalY);

    totalY += 45;

    // ==========================================
    // DASHED LINE
    // ==========================================

    const drawDashedLine = () => {

        ctx.beginPath();

        ctx.setLineDash([6, 4]);

        ctx.lineWidth = 2;

        ctx.moveTo(20, totalY);

        ctx.lineTo(width - 20, totalY);

        ctx.stroke();

        ctx.setLineDash([]);

        totalY += 30;
    };

    drawDashedLine();

    // ==========================================
    // META DETAILS
    // ==========================================

    ctx.font = FONT_NORMAL;
    ctx.textAlign = "left";

    ctx.fillText(
        `No: ${receiptData.bill_number || ""}`,
        24,
        totalY
    );

    totalY += 38;

    ctx.fillText(
        `Date: ${receiptData.date || ""}`,
        24,
        totalY
    );

    totalY += 40;

    drawDashedLine();

    // ==========================================
    // ITEMS
    // ==========================================

    const printRow = (leftText, rightText, font = FONT_NORMAL) => {

        ctx.font = font;

        ctx.textAlign = "left";

        let safeLeft = leftText;

        if (safeLeft.length > 24) {
            safeLeft = safeLeft.substring(0, 22) + "..";
        }

        ctx.fillText(safeLeft, 24, totalY);

        ctx.textAlign = "right";

        ctx.fillText(rightText, width - 24, totalY);

        totalY += 42;
    };

    for (const item of (receiptData.items || [])) {

        const left =
            `${item.quantity} x ${item.name}`;

        const right =
            `₹${parseFloat(item.subtotal || 0).toFixed(2)}`;

        printRow(left, right);
    }

    totalY += 10;

    drawDashedLine();

    // ==========================================
    // PAYMENT METHOD
    // ==========================================

    printRow(
        "Payment Method",
        receiptData.payment_method || "Cash"
    );

    totalY += 10;

    // ==========================================
    // TOTAL
    // ==========================================

    printRow(
        "TOTAL",
        `₹${parseFloat(
            receiptData.total ||
            receiptData.total_amount ||
            0
        ).toFixed(2)}`,
        FONT_TOTAL
    );

    totalY += 40;

    // ==========================================
    // FOOTER
    // ==========================================

    ctx.textAlign = "center";

    ctx.font = FONT_FOOTER;

    ctx.fillText(
        "Thank you for visiting Cha Haus!",
        width / 2,
        totalY
    );

    totalY += 70;

    // ==========================================
    // BOTTOM SPACE
    // ==========================================

    totalY += 30;

    // ==========================================
    // FINAL CROP
    // ==========================================

    const finalCanvas = document.createElement('canvas');

    finalCanvas.width = width;

    finalCanvas.height = totalY;

    const finalCtx = finalCanvas.getContext('2d');

    finalCtx.drawImage(
        tempCanvas,
        0,
        0,
        width,
        totalY,
        0,
        0,
        width,
        totalY
    );

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
