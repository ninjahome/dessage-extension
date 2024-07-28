import {ProtocolKey} from "./protocolKey";
import {ec as EC} from "elliptic";
import Hex from "crypto-js/enc-hex";
import SHA256 from "crypto-js/sha256";
import RIPEMD160 from "crypto-js/ripemd160";
import WordArray from "crypto-js/lib-typedarrays";
import base58 from "bs58";

export function getBtcAddress(key: ProtocolKey, isTestNet: boolean = false): string {
    if (isTestNet) {
        if (key.mulAddr.testBtcAddr) {
            return key.mulAddr.testBtcAddr
        }
        const addr = generateBtcAddress(key.ecKey, isTestNet);
        key.mulAddr.testBtcAddr = addr;
        return addr
    }

    if (key.mulAddr.btcAddr) {
        return key.mulAddr.btcAddr
    }
    const addr = generateBtcAddress(key.ecKey, isTestNet);
    key.mulAddr.btcAddr = addr;
    return addr
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