import {ec as EC} from "elliptic";
import Hex from "crypto-js/enc-hex";
import SHA256 from "crypto-js/sha256";
import RIPEMD160 from "crypto-js/ripemd160";
import WordArray from "crypto-js/lib-typedarrays";
import base58 from "bs58";
import {keccak256} from "js-sha3";
import {convertBits, hexStringToByteArray} from "./util";
import {bech32} from "bech32";

const NinjaAddrLen = 32;
const NinjaAddrPrefix = "NJ";

export class MultiAddress {
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

function generateBtcAddress(ecPriKey: EC.KeyPair, isTestNet: boolean = false): string {
    const pubKey = ecPriKey.getPublic(true, 'hex');
    const publicKeyBytes = Hex.parse(pubKey);
    const sha256Hash = SHA256(publicKeyBytes);
    const ripemd160Hash = RIPEMD160(sha256Hash);

    let version = isTestNet ? '6f' : '00'; // Choose version based on network
    const versionByte = Hex.parse(version);
    const versionedPayload = WordArray.create(versionByte.words.concat(ripemd160Hash.words), versionByte.sigBytes + ripemd160Hash.sigBytes);

    const doubleSHA256 = SHA256(SHA256(versionedPayload));
    const checksum = doubleSHA256.toString(Hex).slice(0, 8);
    const finalPayloadHex = versionedPayload.toString() + checksum; // Concatenate in hex format
    return base58.encode(Buffer.from(finalPayloadHex, 'hex'));
}

function generateEthAddress(ecKey: EC.KeyPair): string {
    const publicKey = ecKey.getPublic();
    const publicKeyBytes = Buffer.from(publicKey.encode('array', false).slice(1));
    const hashedPublicKey = keccak256(publicKeyBytes);
    return '0x' + hashedPublicKey.slice(-40);
}

function encodeKeysWithBech32(ecKey: EC.KeyPair): { publicKey: string, privateKey: string } {
    const publicKeyHex = ecKey.getPublic(true, 'hex');
    const privateKeyBN = ecKey.getPrivate();

    const privateKeyBytes = new Uint8Array(privateKeyBN.toArray('be', 32));

    const publicKeyBytes = hexStringToByteArray(publicKeyHex).slice(1);

    const publicWords = convertBits(publicKeyBytes, 8, 5);
    const privateWords = convertBits(privateKeyBytes, 8, 5);

    const encodedPublicKey = bech32.encode('npub', publicWords);
    const encodedPrivateKey = bech32.encode('nsec', privateWords);

    return {
        publicKey: encodedPublicKey,
        privateKey: encodedPrivateKey
    };
}

function getNinjaAddress(ninjaKey: EC.KeyPair): string {
    const publicKeyArray = ninjaKey.getPublic(true, 'array'); // true表示压缩格式，'array'表示返回字节数组
    const subAddr = new Uint8Array(NinjaAddrLen);
    const publicKeyUint8Array = new Uint8Array(publicKeyArray);
    subAddr.set(publicKeyUint8Array.slice(0, NinjaAddrLen));
    const encodedAddress = base58.encode(subAddr);
    return NinjaAddrPrefix + encodedAddress;
}

export function parseAddrFromKey(ecKey: EC.KeyPair): MultiAddress {
    const address = getNinjaAddress(ecKey);
    const btcAddr = generateBtcAddress(ecKey);
    const ethAddr = generateEthAddress(ecKey);
    const nostrKey = encodeKeysWithBech32(ecKey);
    const btcTestAddr = generateBtcAddress(ecKey, true);
    return new MultiAddress(address, btcAddr, ethAddr, nostrKey.publicKey, btcTestAddr);
}