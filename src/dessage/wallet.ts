import {mnemonicToSeedSync} from "bip39";
import {ProtocolKey} from "./protocolKey";
import {decryptAes, encryptAes} from "./key_crypto";
import {decodeHex} from "./util";
import {EncryptedSeed} from "./master_key";
import {Address} from "./address";

export class DbWallet {
    uuid: string;
    name: string;
    address: Address;
    cipherTxt: EncryptedSeed;

    constructor(uuid: string, address: Address, cipherTxt: EncryptedSeed, name?: string) {
        this.uuid = uuid;
        this.address = address;
        this.cipherTxt = cipherTxt;
        this.name = name ?? "Account ";
    }

    updateName(result: string) {
        this.name = "Account " + result;
    }
}

export class MemWallet {
    address: Address;
    key: ProtocolKey;

    constructor(address: Address, key: ProtocolKey) {
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