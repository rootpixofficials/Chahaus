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
    const chunkSize = 180; // safe BLE packet size
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


// MAIN PRINT FUNCTION (FIXED)
export const printReceipt = async (characteristic, receiptData) => {
    try {
        await characteristic.writeValue(CMD.INIT);

        // HEADER
        await characteristic.writeValue(CMD.CENTER);
        await characteristic.writeValue(CMD.BOLD_ON);
        await writeChunked(characteristic, textEncode("CHA HAUS\n"));
        await characteristic.writeValue(CMD.BOLD_OFF);

        await writeChunked(characteristic, textEncode(
            `Bill #: ${receiptData.bill_number || ""}\n` +
            `${receiptData.date || ""}\n` +
            "------------------------------\n"
        ));

        // ITEMS
        await characteristic.writeValue(CMD.LEFT);

        for (const item of receiptData.items || []) {
            const name = (item.name || "").slice(0, 18); // prevent overflow
            const qty = item.quantity || 0;
            const subtotal = item.subtotal || 0;

            const line = `${qty} x ${name} - ${subtotal}\n`;
            await writeChunked(characteristic, textEncode(line));
        }

        // FOOTER
        await writeChunked(characteristic, textEncode(
            "------------------------------\n"
        ));

        await characteristic.writeValue(CMD.CENTER);
        await characteristic.writeValue(CMD.BOLD_ON);

        await writeChunked(characteristic, textEncode(
            `TOTAL: ${receiptData.total || 0}\n`
        ));

        await characteristic.writeValue(CMD.BOLD_OFF);

        await writeChunked(characteristic, textEncode(
            "\nThank you!\n\n"
        ));

        await characteristic.writeValue(CMD.CUT);

    } catch (err) {
        console.error("Print failed:", err);
    }
};

// Alternative for Android RawBT Intent using HTML for Exact Design
export const printViaRawBT = (receiptData) => {
    // Get absolute URL for the logo so the printer can fetch it
    const logoUrl = window.location.origin + "/Image/Cha_Haus_logo_final-removebg-preview.png";

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
            <img src="${logoUrl}" style="width:80px; height:auto; margin-bottom:5px;" onerror="this.style.display='none'" />
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
