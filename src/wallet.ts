import {__tableNameWallet, databaseAddItem, databaseQueryAll} from "./database";
import {mnemonicToSeedSync} from "bip39";
import {enc, AES, lib, PBKDF2, SHA256, RIPEMD160} from 'crypto-js';
import nacl from "tweetnacl";
import {ec as EC} from "elliptic";
import {bech32} from "bech32";
import base58 from "bs58";
import {keccak256} from "ethereumjs-util";

const NinjaAddrLen = 32
const NinjaAddrPrefix = "NJ";

export class ProtocolKey {
    pri: Uint8Array;
    NinjaAddr: string;
    BtcAddr: string;
    EthAddr: string;
    NostrAddr: string;
    NostrPri: string;
    BtcTestAddr: string;
    ninjaKey?: nacl.BoxKeyPair;
    ecKey?: EC.KeyPair;

    constructor(pri: Uint8Array) {
        this.ninjaKey = nacl.box.keyPair.fromSecretKey(pri);
        this.ecKey = castToEcKey(pri);
        this.pri = pri;

        const nostrEncodedKey = encodeKeysWithBech32(this.ecKey);
        this.NostrAddr = nostrEncodedKey.publicKey;
        this.NostrPri = nostrEncodedKey.privateKey;

        this.NinjaAddr = getNinjaAddress(this.ninjaKey);
        this.EthAddr = generateEthAddress(this.ecKey);
        this.BtcAddr = generateBtcAddress(this.ecKey);
        this.BtcTestAddr = generateBtcAddress(this.ecKey, true);
    }
}

function castToEcKey(secretKey: Uint8Array): EC.KeyPair {
    const curve = new EC('secp256k1');
    const ecKey = curve.keyFromPrivate(secretKey, 'hex');
    const privateKey = ecKey.getPrivate();
    if (!privateKey || !curve.n || privateKey.cmp(curve.n) >= 0 || privateKey.isZero()) {
        throw new Error('Invalid private key');
    }
    return ecKey;
}


function encodeKeysWithBech32(ecKey: EC.KeyPair): { publicKey: string, privateKey: string } {
    const publicKeyHex = ecKey.getPublic(true, 'hex');
    const privateKeyHex = ecKey.getPrivate('hex');

    const publicKeyBytes = hexStringToByteArray(publicKeyHex).slice(1);
    const privateKeyBytes = hexStringToByteArray(privateKeyHex);

    const publicWords = convertBits(publicKeyBytes, 8, 5);
    const privateWords = convertBits(privateKeyBytes, 8, 5);

    const encodedPublicKey = bech32.encode('npub', publicWords);
    const encodedPrivateKey = bech32.encode('nsec', privateWords);

    return {
        publicKey: encodedPublicKey,
        privateKey: encodedPrivateKey
    };
}

function getNinjaAddress(ninjaKey: nacl.BoxKeyPair): string {
    const publicKey = ninjaKey.publicKey;
    const subAddr = new Uint8Array(NinjaAddrLen);

    subAddr.set(publicKey.subarray(0, NinjaAddrLen));
    const encodedAddress = base58.encode(subAddr);
    return NinjaAddrPrefix + encodedAddress;
}

function generateEthAddress(ecPriKey: EC.KeyPair): string {
    const publicKey = ecPriKey.getPublic();
    const publicKeyBytes = Buffer.from(publicKey.encode('array', false).slice(1));
    const hashedPublicKey = keccak256(publicKeyBytes).toString('hex');
    return '0x' + hashedPublicKey.slice(-40);
}

function generateBtcAddress(ecPriKey: EC.KeyPair, isTestNet: boolean = false): string {
    const pubKey = ecPriKey.getPublic(true, 'hex');
    const publicKeyBytes = enc.Hex.parse(pubKey);
    const sha256Hash = SHA256(publicKeyBytes);
    const ripemd160Hash = RIPEMD160(sha256Hash);

    let version = isTestNet ? '6f' : '00'; // Choose version based on network
    const versionByte = enc.Hex.parse(version);
    const versionedPayload = lib.WordArray.create(versionByte.words.concat(ripemd160Hash.words), versionByte.sigBytes + ripemd160Hash.sigBytes);

    const doubleSHA256 = SHA256(SHA256(versionedPayload));
    const checksum = doubleSHA256.toString(enc.Hex).slice(0, 8);
    const finalPayloadHex = versionedPayload.toString() + checksum; // Concatenate in hex format
    return base58.encode(Buffer.from(finalPayloadHex, 'hex'));
}

export class Wallet {
    uuid: string;
    address: string;
    cipherTxt: CipherData;
    mnemonic: string;
    key?: ProtocolKey;

    constructor(uuid: string, addr: string, cipherTxt: CipherData, mnemonic: string, key?: ProtocolKey) {
        this.uuid = uuid;
        this.address = addr;
        this.cipherTxt = cipherTxt;
        this.mnemonic = mnemonic;
        this.key = key;
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

    async syncToDb(): Promise<void> {
        const item = new DbWallet(this.uuid, this.address, this.cipherTxt, this.mnemonic);
        const result = await databaseAddItem(__tableNameWallet, item);
        console.log("save wallet result=>", result);
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
    cipherTxt: CipherData;
    mnemonic: string;

    constructor(uuid: string, address: string, cipherTxt: CipherData, mnemonic: string) {
        this.uuid = uuid;
        this.address = address;
        this.cipherTxt = cipherTxt;
        this.mnemonic = mnemonic;
    }
}

class CipherData {
    cipherTxt: string;
    iv: string;
    salt: string;

    constructor(cipherTxt: string, iv: string, salt: string) {
        this.cipherTxt = cipherTxt;
        this.iv = iv;
        this.salt = salt;
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

function decryptAes(data: CipherData, password: string): string {
    const salt = enc.Hex.parse(data.salt);
    const iv = enc.Hex.parse(data.iv);
    const key = PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 1000
    });
    const decrypted = AES.decrypt(data.cipherTxt, key, {iv: iv});

    return decrypted.toString(enc.Utf8);
}

export function NewWallet(mnemonic: string, password: string): void {
    const uuid = generateUUID();
    const seedBuffer = mnemonicToSeedSync(mnemonic);
    const seedUint8Array: Uint8Array = new Uint8Array(seedBuffer);
    const key = new ProtocolKey(seedUint8Array);
}


function hexStringToByteArray(hexString: string): Uint8Array {
    if (hexString.length % 2 !== 0) {
        throw new Error("Hex string must have an even length");
    }
    return new Uint8Array(Buffer.from(hexString, 'hex'));
}

function convertBits(data: Uint8Array, fromBits: number, toBits: number, pad = true): Uint8Array {
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

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c: string): string {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
