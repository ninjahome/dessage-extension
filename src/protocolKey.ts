import {CipherData, OuterWallet, ProtocolKey} from "./Objects";
import nacl from "tweetnacl";
import {ec as EC} from "elliptic";
import {bech32} from "bech32";
import base58 from "bs58";
import {keccak256} from "ethereumjs-util";
import AES from "crypto-js/aes";
import PBKDF2 from "crypto-js/pbkdf2";
import RIPEMD160 from "crypto-js/ripemd160";
import SHA256 from "crypto-js/sha256";
import Hex from "crypto-js/enc-hex";
import Utf8 from "crypto-js/enc-utf8";
import WordArray from "crypto-js/lib-typedarrays"; // 用于 WordArray 的操作
import {convertBits, hexStringToByteArray} from "./util";

const NinjaAddrLen = 32;
const NinjaAddrPrefix = "NJ";

export function newProtoKey(pri: Uint8Array): ProtocolKey {
    const key = new ProtocolKey(pri);
    key.ninjaKey = nacl.box.keyPair.fromSecretKey(key.pri);
    key.ecKey = castToEcKey(key.pri);
    const nostrEncodedKey = encodeKeysWithBech32(key.ecKey);
    key.NostrPri = nostrEncodedKey.privateKey;

    const NostrAddr = nostrEncodedKey.publicKey;
    const address = getNinjaAddress(key.ninjaKey);
    const EthAddr = generateEthAddress(key.ecKey);
    const BtcAddr = generateBtcAddress(key.ecKey);
    const BtcTestAddr = generateBtcAddress(key.ecKey, true);

    key.outerWallet = new OuterWallet(address, BtcAddr, EthAddr, NostrAddr, BtcTestAddr);
    return key;
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

export function decryptKey(pwd: string, cipherTxt: CipherData): ProtocolKey {
    const decryptedPri = decryptAes(cipherTxt, pwd);
    const priArray = hexStringToByteArray(decryptedPri);
    return newProtoKey(priArray);
}

function decryptAes(data: CipherData, password: string): string {
    const salt = Hex.parse(data.salt);
    const iv = Hex.parse(data.iv);
    const key = PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 1000
    });
    const decrypted = AES.decrypt(data.cipherTxt, key, { iv: iv });

    return decrypted.toString(Utf8);
}
