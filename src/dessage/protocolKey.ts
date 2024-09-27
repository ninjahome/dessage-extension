import {ec as EC} from "elliptic";
import nacl from "tweetnacl";
import base58 from "bs58";
import {keccak256} from "js-sha3";
import {decodeHex, encodeHex} from "./util";
import {ed2CurvePri} from "./edwards25519";
import {DessageAddrPrefix, Address, toBtcAddress, toNostrAddr} from "./address";

export class ProtocolKey {
    pri: Uint8Array;
    ecKey: EC.KeyPair;
    dessageKey: nacl.SignKeyPair;
    readonly curvePriKey: Uint8Array;

    constructor(pri: Uint8Array) {
        this.pri = pri;
        this.dessageKey = nacl.sign.keyPair.fromSeed(pri);
        const ec = new EC('secp256k1');
        this.ecKey = ec.keyFromPrivate(pri);
        this.curvePriKey = ed2CurvePri(this.dessageKey.secretKey);
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

    generateBtcAddress(isTestNet: boolean = false): string {
        const pubKey = this.ecKey.getPublic(true, 'hex');
        return toBtcAddress(pubKey, isTestNet);
    }

    encodeKeysWithBech32(): { publicKey: string, privateKey: string } {
        return toNostrAddr(this.ecKey);
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

    driveAddress(): Address {
        const address = this.getPub()
        const btcAddr = this.generateBtcAddress();
        const ethAddr = this.getEthPub();
        const nostrKey = this.encodeKeysWithBech32();
        return new Address(address, btcAddr, ethAddr, nostrKey.publicKey, 0);
    }
}

