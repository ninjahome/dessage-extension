import {__tableNameWallet, databaseAddItem, databaseQueryAll} from "./database";
import {mnemonicToSeedSync} from "bip39";
import {ProtocolKey} from "./protocolKey";
import {decryptAes, encryptAes,CipherData} from "./key_crypto";
import {hexStringToByteArray} from "./util";
import {MultiAddress, parseAddrFromKey} from "./multi_addr";

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

export async function saveWallet(w: DbWallet): Promise<void> {
    const result = await databaseAddItem(__tableNameWallet, w);
    console.log("save wallet result=>", result);
}

export async function loadLocalWallet(): Promise<DbWallet[]> {
    const wallets = await databaseQueryAll(__tableNameWallet);
    if (!wallets) {
        return [];
    }
    const walletObj: DbWallet[] = [];
    for (const dbWallet of wallets) {
        console.log("load wallet success:=>", dbWallet.address);
        walletObj.push(dbWallet);
    }
    return walletObj;
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
    const mulAddr = parseAddrFromKey(key.ecKey);
    return new DbWallet(uuid, mulAddr, data);
}

export function castToMemWallet(pwd: string, wallet: DbWallet): MemWallet {
    const decryptedPri = decryptAes(wallet.cipherTxt, pwd);
    const priArray = hexStringToByteArray(decryptedPri);
    const key = new ProtocolKey(priArray);
    const address = parseAddrFromKey(key.ecKey);
    return new MemWallet(address, key);
}