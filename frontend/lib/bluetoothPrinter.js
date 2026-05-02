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

// Alternative for Android RawBT Intent
export const printViaRawBT = (receiptData) => {
    let text = `CHA HAUS\n`;
    text += `Bill #: ${receiptData.bill_number}\n`;
    text += `${receiptData.date}\n`;
    text += `--------------------------------\n`;
    receiptData.items.forEach(item => {
        text += `${item.quantity} x ${item.name.padEnd(15)} ${item.subtotal}\n`;
    });
    text += `--------------------------------\n`;
    text += `TOTAL: ${receiptData.total}\n`;
    text += `\nThank you for visiting!\n\n\n`;

    const intentUrl = 'intent:' + encodeURIComponent(text) + '#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;';
    window.location.href = intentUrl;
};
