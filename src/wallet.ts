import {__tableNameWallet, databaseAddItem, databaseQueryAll} from "./database";
import {mnemonicToSeedSync} from "bip39";
import {enc, AES, lib, PBKDF2 } from 'crypto-js';
import {CipherData, DbWallet, Wallet} from "./Objects";

export async function saveWallet(w: Wallet): Promise<void> {
    const item = new DbWallet(w.uuid, w.address, w.cipherTxt, w.mnemonic);
    const result = await databaseAddItem(__tableNameWallet, item);
    console.log("save wallet result=>", result);
}

export async function loadLocalWallet(): Promise<Wallet[]> {
    const wallets = await databaseQueryAll(__tableNameWallet);
    if (!wallets) {
        return [];
    }
    const walletObj: Wallet[] = [];
    for (const dbWallet of wallets) {
        const wallet = new Wallet(dbWallet.uuid, dbWallet.address, dbWallet.cipherTxt, dbWallet.mnemonic);
        console.log("load wallet success:=>", wallet.address);
        walletObj.push(wallet);
    }
    return walletObj;
}

function encryptAes(plainTxt: string, password: string): CipherData {
    const salt = lib.WordArray.random(128 / 8);
    const key = PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 1000
    });
    const iv = lib.WordArray.random(128 / 8);
    const encrypted = AES.encrypt(plainTxt, key, {iv: iv});

    return new CipherData(encrypted.toString(), iv.toString(enc.Hex), salt.toString(enc.Hex));
}

export function NewWallet(mnemonic: string, password: string): void {
    const uuid = generateUUID();
    const seedBuffer = mnemonicToSeedSync(mnemonic);
    const seedUint8Array: Uint8Array = new Uint8Array(seedBuffer);

}

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c: string): string {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
