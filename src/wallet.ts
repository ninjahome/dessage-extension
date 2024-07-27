import {__tableNameWallet, databaseQueryAll} from "./database";
import PBKDF2 from 'crypto-js/pbkdf2';
import AES from 'crypto-js/aes';
import Hex from 'crypto-js/enc-hex';
import Utf8 from 'crypto-js/enc-utf8'
import {Buffer} from 'buffer';
import {ProtocolKey} from "./key";

export class Wallet {
    uuid: string;
    address: string;
    cipherTxt: string;
    mnemonic: string;
    key?: ProtocolKey;

    constructor(uuid: string, addr: string, cipherTxt: string, mnemonic: string, key?: ProtocolKey) {
        this.uuid = uuid;
        this.address = addr;
        this.cipherTxt = cipherTxt;
        this.mnemonic = mnemonic;
        this.key = key ;
    }

    decryptKey(pwd: string): void {
        const decryptedPri = decryptAes(this.cipherTxt, pwd);
        const priArray = hexStringToByteArray(decryptedPri);
        const key = new ProtocolKey(priArray);
        if (this.address !== key.NinjaAddr) {
            throw new Error("Incorrect password");
        }
        this.key = key;
    }
}

export class OuterWallet {
    address: string;
    btcAddr: string;
    ethAddr: string;
    nostrAddr: string;
    testBtcAddr: string;

    constructor(address: string, btcAddr: string, ethAddr: string, nostrAddr: string, testBtcAddr: string) {
        this.address = address;
        this.btcAddr = btcAddr;
        this.ethAddr = ethAddr;
        this.nostrAddr = nostrAddr;
        this.testBtcAddr = testBtcAddr;
    }
}

export class DbWallet {
    uuid: string;
    address: string;
    cipherTxt: string;
    mnemonic: string;

    constructor(uuid: string, address: string, cipherTxt: string, mnemonic: string) {
        this.uuid = uuid;
        this.address = address;
        this.cipherTxt = cipherTxt;
        this.mnemonic = mnemonic;
    }
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

function decryptAes(encryptedData: string, password: string): string {
    const data = JSON.parse(encryptedData);
    const salt = Hex.parse(data.salt);
    const iv = Hex.parse(data.iv);
    const key = PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 1000
    });
    const decrypted = AES.decrypt(data.cipherTxt, key, {iv: iv});

    return decrypted.toString(Utf8);
}

function hexStringToByteArray(hexString: string): Uint8Array {
    if (hexString.length % 2 !== 0) {
        throw new Error("Hex string must have an even length");
    }
    return new Uint8Array(Buffer.from(hexString, 'hex'));
}