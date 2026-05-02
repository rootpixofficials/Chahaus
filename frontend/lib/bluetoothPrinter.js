/**
 * Bluetooth Printer Utility for ESC/POS Thermal Printers
 * Supports Web Bluetooth API (Chrome/Edge/Android)
 */

export const connectPrinter = async () => {
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }], // Standard Printer Service
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

export const printReceipt = async (characteristic, receiptData) => {
    const encoder = new TextEncoder();
    
    // ESC/POS Commands
    const INIT = [0x1B, 0x40]; // Initialize printer
    const ALIGN_CENTER = [0x1B, 0x61, 1];
    const ALIGN_LEFT = [0x1B, 0x61, 0];
    const BOLD_ON = [0x1B, 0x45, 1];
    const BOLD_OFF = [0x1B, 0x45, 0];
    const FEED_AND_CUT = [0x1D, 0x56, 66, 0]; // Feed 3 lines and cut

    const send = async (data) => {
        const chunk = new Uint8Array(data);
        await characteristic.writeValue(chunk);
    };

    // Header
    await send(INIT);
    await send(ALIGN_CENTER);
    await send(BOLD_ON);
    await send(encoder.encode("CHA HAUS\n"));
    await send(BOLD_OFF);
    await send(encoder.encode(`Bill #: ${receiptData.bill_number}\n`));
    await send(encoder.encode(`${receiptData.date}\n`));
    await send(encoder.encode("--------------------------------\n"));

    // Items
    await send(ALIGN_LEFT);
    for (const item of receiptData.items) {
        const line = `${item.quantity} x ${item.name.padEnd(18)} ₹${item.subtotal}\n`;
        await send(encoder.encode(line));
    }

    // Footer
    await send(ALIGN_CENTER);
    await send(encoder.encode("--------------------------------\n"));
    await send(BOLD_ON);
    await send(encoder.encode(`TOTAL: ₹${receiptData.total}\n`));
    await send(BOLD_OFF);
    await send(encoder.encode("\nThank you for visiting!\n"));
    await send(FEED_AND_CUT);
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

    const encodedText = btoa(text);
    window.location.href = `rawbt:base64,${encodedText}`;
};
