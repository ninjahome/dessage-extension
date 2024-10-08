import Hex from "crypto-js/enc-hex";
import PBKDF2 from "crypto-js/pbkdf2";
import AES from "crypto-js/aes";
import Utf8 from "crypto-js/enc-utf8";
import WordArray from "crypto-js/lib-typedarrays";
import {EncryptedSeed} from "./master_key";

const CryptoKeySize = 8;
const ScryptN = 1024;


export function decryptAes(data: EncryptedSeed, password: string): string {
    const salt = Hex.parse(data.salt);
    const iv = Hex.parse(data.iv);
    const key = PBKDF2(password, salt, {
        keySize: CryptoKeySize,
        iterations: ScryptN
    });
    const decrypted = AES.decrypt(data.cipherTxt, key, {iv: iv});

    return decrypted.toString(Utf8);
}

export function encryptAes(plainTxt: string, password: string): EncryptedSeed {
    const salt = WordArray.random(128 / 8);
    const key = PBKDF2(password, salt, {
        keySize: CryptoKeySize,
        iterations: ScryptN
    });
    const iv = WordArray.random(128 / 8);
    const encrypted = AES.encrypt(plainTxt, key, {iv: iv});

    return new EncryptedSeed(encrypted.toString(), iv.toString(Hex), salt.toString(Hex));
}