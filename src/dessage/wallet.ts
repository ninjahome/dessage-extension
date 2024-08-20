import {mnemonicToSeedSync} from "bip39";
import {MultiAddress, ProtocolKey} from "./protocolKey";
import {decryptAes, encryptAes,CipherData} from "./key_crypto";
import {decodeHex} from "./util";

export class DbWallet {
    uuid: string;
    address: MultiAddress;
    cipherTxt: CipherData;

    constructor(uuid: string, address: MultiAddress, cipherTxt: CipherData) {
        this.uuid = uuid;
        this.address = address;
        this.cipherTxt = cipherTxt;
    }
}

export class MemWallet {
    address: MultiAddress;
    key: ProtocolKey;
    constructor(address: MultiAddress, key: ProtocolKey) {
        this.address = address;
        this.key = key;
    }
}

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c: string): string {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function newWallet(mnemonic: string, password: string): DbWallet {
    const uuid = generateUUID();
    const seedBuffer = mnemonicToSeedSync(mnemonic);
    const first32Bytes = seedBuffer.subarray(0, 32);
    const hexPri = first32Bytes.toString('hex');
    const seedUint8Array: Uint8Array = new Uint8Array(first32Bytes);
    const key = new ProtocolKey(seedUint8Array);
    const data = encryptAes(hexPri, password);
    const mulAddr = key.driveAddress();
    return new DbWallet(uuid, mulAddr, data);
}

export function castToMemWallet(pwd: string, wallet: DbWallet): MemWallet {
    const decryptedPri = decryptAes(wallet.cipherTxt, pwd);
    const priArray = decodeHex(decryptedPri);
    const key = new ProtocolKey(priArray);
    const address = key.driveAddress();
    return new MemWallet(address, key);
}