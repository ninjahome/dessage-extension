import {ec as EC} from "elliptic";
import nacl from "tweetnacl";
import base58 from "bs58";
import {keccak256} from "js-sha3";
import Hex from "crypto-js/enc-hex";
import SHA256 from "crypto-js/sha256";
import RIPEMD160 from "crypto-js/ripemd160";
import WordArray from "crypto-js/lib-typedarrays";
import {convertBits, encodeHex, decodeHex} from "./util";
import {bech32} from "bech32";


const DessageAddrPrefix = "NJ";

export class MultiAddress {
    address: string;
    btcAddr: string;
    ethAddr: string;
    nostrAddr: string;
    testBtcAddr: string;
    name?:string;

    constructor(address: string, btcAddr: string, ethAddr: string, nostrAddr: string, testBtcAddr: string) {
        this.address = address;
        this.btcAddr = btcAddr;
        this.ethAddr = ethAddr;
        this.nostrAddr = nostrAddr;
        this.testBtcAddr = testBtcAddr;
    }
}


export class ProtocolKey {
    pri: Uint8Array;
    ecKey: EC.KeyPair;
    dessageKey: nacl.SignKeyPair;

    constructor(pri: Uint8Array) {
        this.pri = pri;
        this.dessageKey = nacl.sign.keyPair.fromSeed(pri);
        const ec = new EC('secp256k1');
        this.ecKey = ec.keyFromPrivate(pri);
    }


    private getPub(): string {
        const publicKeyArray = this.dessageKey.publicKey;
        const publicKeyUint8Array = new Uint8Array(publicKeyArray);
        const encodedAddress = base58.encode(publicKeyUint8Array);
        return DessageAddrPrefix + encodedAddress;
    }

    private getEthPub(): string {
        const publicKey = this.ecKey.getPublic();
        const publicKeyBytes = Buffer.from(publicKey.encode('array', false).slice(1));
        const hashedPublicKey = keccak256(publicKeyBytes);
        return '0x' + hashedPublicKey.slice(-40);
    }

    rawPriKey(): Uint8Array {
        return this.pri;
    }


    generateBtcAddress(isTestNet: boolean = false): string {
        const pubKey = this.ecKey.getPublic(true, 'hex');
        const publicKeyBytes = Hex.parse(pubKey);
        const sha256Hash = SHA256(publicKeyBytes);
        const ripemd160Hash = RIPEMD160(sha256Hash);
        let version = isTestNet ? '6f' : '00'; // Choose version based on network
        const versionByte = new Uint8Array([parseInt(version, 16)]);
        const ripemd160Bytes = Uint8Array.from(Hex.parse(ripemd160Hash.toString()).words.map(word => [
            (word >> 24) & 0xFF, (word >> 16) & 0xFF, (word >> 8) & 0xFF, word & 0xFF
        ]).flat());

        const versionedPayload = new Uint8Array(versionByte.length + ripemd160Bytes.length);
        versionedPayload.set(versionByte, 0);
        versionedPayload.set(ripemd160Bytes, versionByte.length);

        const wordPayload = WordArray.create(versionedPayload);
        const doubleSHA256 = SHA256(SHA256(wordPayload));
        const checkSumArray = Uint8Array.from(Hex.parse(doubleSHA256.toString()).words.map(word => [
            (word >> 24) & 0xFF, (word >> 16) & 0xFF, (word >> 8) & 0xFF, word & 0xFF
        ]).flat()).slice(0, 4);

        const finalPayload = new Uint8Array(versionedPayload.length + 4);
        finalPayload.set(versionedPayload, 0);
        finalPayload.set(checkSumArray, versionedPayload.length);
        return base58.encode(Buffer.from(finalPayload));
    }

    encodeKeysWithBech32(): { publicKey: string, privateKey: string } {
        const publicKeyHex = this.ecKey.getPublic(true, 'hex');
        const privateKeyBN = this.ecKey.getPrivate();

        const privateKeyBytes = new Uint8Array(privateKeyBN.toArray('be', 32));
        const publicKeyBytes = decodeHex(publicKeyHex).slice(1);

        const publicWords = convertBits(publicKeyBytes, 8, 5);
        const privateWords = convertBits(privateKeyBytes, 8, 5);

        const encodedPublicKey = bech32.encode('npub', publicWords);
        const encodedPrivateKey = bech32.encode('nsec', privateWords);

        return {
            publicKey: encodedPublicKey,
            privateKey: encodedPrivateKey
        };
    }

    static signData(priRaw: Uint8Array, message: Uint8Array): string {
        const signKey = nacl.sign.keyPair.fromSeed(priRaw);
        const signature = nacl.sign.detached(message, signKey.secretKey);
        return encodeHex(signature);
    }

    static verifySignature(priRaw: Uint8Array, signature: string, message: Uint8Array): boolean {
        try {
            const signKey = nacl.sign.keyPair.fromSeed(priRaw);
            const detachedSignature = decodeHex(signature);
            return nacl.sign.detached.verify(message, detachedSignature, signKey.publicKey);
        } catch (e) {
            console.log("------>>> verifySignature failed", e);
            return false;
        }
    }

    static isValidAddress(address: string): boolean {
        if (!address.startsWith(DessageAddrPrefix)) {
            return false; // 地址必须以BMailAddrPrefix开头
        }

        const encodedAddress = address.slice(DessageAddrPrefix.length);

        try {
            const decoded = base58.decode(encodedAddress);
            if (decoded.length !== 32) {
                return false;
            }
        } catch (e) {
            return false;
        }

        return true;
    }

    driveAddress(): MultiAddress {
        const address = this.getPub()
        const btcAddr = this.generateBtcAddress();
        const ethAddr = this.getEthPub();
        const nostrKey = this.encodeKeysWithBech32();
        const btcTestAddr = this.generateBtcAddress(true);
        return new MultiAddress(address, btcAddr, ethAddr, nostrKey.publicKey, btcTestAddr);
    }
}

