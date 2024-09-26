import {ec as EC} from "elliptic";
import {derivePath, ExtendedKey} from "./extended_key";
import Hex from "crypto-js/enc-hex";
import SHA256 from "crypto-js/sha256";
import RIPEMD160 from "crypto-js/ripemd160";
import WordArray from "crypto-js/lib-typedarrays";
import base58 from "bs58";
import {keccak256} from "js-sha3";
import {Buffer} from "buffer";
import {convertBits, decodeHex} from "./util";
import {bech32} from "bech32";

export class DsgAccount {
    address: string;
    btcAddress: string;
    ethAddress: string;
    nostrAddr: string;

    constructor(seedKey: ExtendedKey, idx: number) {
        const dsgKey = derivePath(seedKey, "m/44'/1286'/0'/0/" + idx);
        const btcKey = derivePath(seedKey, "m/44'/0'/0'/0/" + idx);
        const ethKey = derivePath(seedKey, "m/44'/60'/0'/0/" + idx);

        this.address = toAddress(dsgKey.publicKey);
        this.btcAddress = toBtcAddress(btcKey.publicKey.toString('hex'));
        const ec = new EC('secp256k1');
        const ecKeyEth = ec.keyFromPrivate(ethKey.privateKey!);
        this.ethAddress = toEthAddress(ecKeyEth);
        const ecKeyNostr = ec.keyFromPrivate(dsgKey.privateKey!);
        const result = toNostrAddr(ecKeyNostr);
        this.nostrAddr = result.publicKey;

        console.log('DSG 子私钥1 (Child Private Key):', dsgKey.privateKey?.toString('hex'));
        console.log('DSG 子公钥1 (Child Public Key):', dsgKey.publicKey.toString('hex'));
        console.log('DSG Address:', this.address);

        console.log('BTC 子私钥1 (Child Private Key):', btcKey.privateKey?.toString('hex'));
        console.log('BTC 子公钥1 (Child Public Key):', btcKey.publicKey.toString('hex'));
        console.log('BTC Address:', this.btcAddress);

        console.log('ETH 子私钥1 (Child Private Key):', ethKey.privateKey?.toString('hex'));
        console.log('ETH 子公钥1 (Child Public Key):', ethKey.publicKey.toString('hex'));
        console.log('ETH Address:', this.ethAddress);
        console.log('Nostr Address:', this.nostrAddr);
    }
}

export function toBtcAddress(pubKey: string, isTestNet: boolean = false): string {
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

export function toEthAddress(ecKey: EC.KeyPair): string {
    const publicKey = ecKey.getPublic();
    const publicKeyBytes = Buffer.from(publicKey.encode('array', false).slice(1));
    const hashedPublicKey = keccak256(publicKeyBytes);
    return '0x' + hashedPublicKey.slice(-40);
}

const DessageAddrPrefix = "NJ";
export function toAddress(publicKey: Buffer): string {
    const encodedAddress = base58.encode(publicKey.subarray(1));
    return DessageAddrPrefix + encodedAddress;
}

export function toNostrAddr(ecKey: EC.KeyPair){
    const publicKeyHex = ecKey.getPublic(true, 'hex');
    const privateKeyBN = ecKey.getPrivate();

    const privateKeyBytes = new Uint8Array(privateKeyBN.toArray('be', 32));
    const publicKeyBytes = decodeHex(publicKeyHex).slice(1);

    const publicWords = convertBits(publicKeyBytes, 8, 5);
    const privateWords = convertBits(privateKeyBytes, 8, 5);

    const encodedPublicKey = bech32.encode('npub', publicWords);
    const encodedPrivateKey = bech32.encode('nsec', privateWords);

    // console.log("-------->>> pub=>", encodedPublicKey);
    // console.log("-------->>> pri=>", encodedPrivateKey);

    return {
        publicKey: encodedPublicKey,
        privateKey: encodedPrivateKey
    };
}