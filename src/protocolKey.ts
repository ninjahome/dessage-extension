import nacl from "tweetnacl";
import {ec as EC} from "elliptic";
import base58 from "bs58";
import AES from "crypto-js/aes";
import PBKDF2 from "crypto-js/pbkdf2";
import Hex from "crypto-js/enc-hex";
import Utf8 from "crypto-js/enc-utf8";
import {hexStringToByteArray} from "./util";
import {CipherData, DbWallet, MultiAddress} from "./Objects";

const NinjaAddrLen = 32;
const NinjaAddrPrefix = "NJ";

export class ProtocolKey {
    pri: Uint8Array;
    mulAddr: MultiAddress;
    ecKey: EC.KeyPair;
    ninjaKey: nacl.BoxKeyPair
    NostrPri?: string | null;

    constructor(pri: Uint8Array) {
        this.pri = pri;
        this.ninjaKey = nacl.box.keyPair.fromSecretKey(pri);
        const address = getNinjaAddress(this.ninjaKey);
        this.mulAddr = new MultiAddress(address);
        this.ecKey = castToEcKey(pri);
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

function getNinjaAddress(ninjaKey: nacl.BoxKeyPair): string {
    const publicKey = ninjaKey.publicKey;
    const subAddr = new Uint8Array(NinjaAddrLen);

    subAddr.set(publicKey.subarray(0, NinjaAddrLen));
    const encodedAddress = base58.encode(subAddr);
    return NinjaAddrPrefix + encodedAddress;
}


export function decryptKey(pwd: string, cipherTxt: CipherData): ProtocolKey {
    const decryptedPri = decryptAes(cipherTxt, pwd);
    const priArray = hexStringToByteArray(decryptedPri);
    return new ProtocolKey(priArray);
}

export function castToOuterWallet(pwd: string, wallet: DbWallet): MultiAddress {
    const key = decryptKey(pwd,wallet.cipherTxt);
    return key.mulAddr;
}

function decryptAes(data: CipherData, password: string): string {
    const salt = Hex.parse(data.salt);
    const iv = Hex.parse(data.iv);
    const key = PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 1000
    });
    const decrypted = AES.decrypt(data.cipherTxt, key, {iv: iv});

    return decrypted.toString(Utf8);
}
