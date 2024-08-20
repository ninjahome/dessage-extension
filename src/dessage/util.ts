export function convertBits(data: Uint8Array, fromBits: number, toBits: number, pad = true): Uint8Array {
    let acc = 0;
    let bits = 0;
    const result: number[] = [];
    const maxv = (1 << toBits) - 1;

    for (let value of data) {
        if (value < 0 || value >> fromBits !== 0) {
            throw new Error('Invalid value for convertBits');
        }
        acc = (acc << fromBits) | value;
        bits += fromBits;
        while (bits >= toBits) {
            bits -= toBits;
            result.push((acc >> bits) & maxv);
        }
    }
    if (pad) {
        if (bits > 0) {
            result.push((acc << (toBits - bits)) & maxv);
        }
    } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) {
        throw new Error('Invalid data for convertBits');
    }

    return new Uint8Array(result);
}

export function encodeHex(array: Uint8Array): string {
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function decodeHex(hexString: string): Uint8Array {
    if (hexString.length % 2 !== 0) {
        throw new Error("Hex string must have an even length");
    }
    return new Uint8Array(Buffer.from(hexString, 'hex'));
}
