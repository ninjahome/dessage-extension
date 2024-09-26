import Hex from 'crypto-js/enc-hex';
import WordArray from 'crypto-js/lib-typedarrays';
import HmacSHA512 from 'crypto-js/hmac-sha512';
import {ec as EC} from 'elliptic';
import {Buffer} from "buffer";

const ec = new EC('secp256k1');


export function deriveChild(privateKey: Buffer | null, publicKey: Buffer, chainCode: Buffer, index: number): ExtendedKey {
    const indexBuffer = Buffer.allocUnsafe(4);
    indexBuffer.writeUInt32BE(index, 0);

    let data: Buffer;
    if (index >= 0x80000000) {
        if (privateKey === null) {
            throw new Error('无法从公钥硬化派生');
        }
        data = Buffer.concat([Buffer.alloc(1, 0), privateKey, indexBuffer]);
    } else {
        data = Buffer.concat([publicKey, indexBuffer]);
    }

    // HMAC-SHA512 计算 Il 和 Ir
    const hmac = HmacSHA512(WordArray.create(data), WordArray.create(chainCode));
    const I = Buffer.from(hmac.toString(Hex), 'hex');
    const IL = I.subarray(0, 32); // Il
    const IR = I.subarray(32);    // Ir

    let childPrivateKey: Buffer | null = null;
    let childPublicKey: Buffer;

    if (privateKey) {
        const key = ec.keyFromPrivate(privateKey);
        const tweakKey = ec.keyFromPrivate(IL);
        const childPrivate = key.getPrivate().add(tweakKey.getPrivate()).mod(ec.curve.n);
        childPrivateKey = Buffer.from(childPrivate.toArray('be', 32));

        const childKey = ec.keyFromPrivate(childPrivateKey);
        childPublicKey = Buffer.from(childKey.getPublic(true, 'array'));  // 压缩公钥
    } else {
        const parentPubKey = ec.keyFromPublic(publicKey);
        const ilPoint = ec.g.mul(IL);
        const childPubKey = parentPubKey.getPublic().add(ilPoint);
        childPublicKey = Buffer.from(childPubKey.encodeCompressed());  // 压缩公钥
    }

    return {
        privateKey: childPrivateKey,
        publicKey: childPublicKey,
        chainCode: IR,
    };
}

// 实现 BIP44 派生路径
export function derivePath(masterKey: ExtendedKey, path: string): ExtendedKey {
    const segments = path.split('/').slice(1); // 移除 'm'
    let derivedKey = masterKey;

    segments.forEach(segment => {
        let index = parseInt(segment.replace("'", ''), 10);
        if (segment.endsWith("'")) {
            index += 0x80000000;
        }
        derivedKey = deriveChild(derivedKey.privateKey, derivedKey.publicKey, derivedKey.chainCode, index);
    });

    return derivedKey;
}

// 从种子生成主密钥
export function fromMasterSeed(seed: Buffer): ExtendedKey {
    const hmac = HmacSHA512(WordArray.create(seed), 'Bitcoin seed');
    const I = Buffer.from(hmac.toString(Hex), 'hex');
    const privateKey = I.subarray(0, 32);
    const key = ec.keyFromPrivate(privateKey);
    const publicKey = Buffer.from(key.getPublic(true, 'array'));  // 压缩公钥
    const chainCode = I.subarray(32);
    return new ExtendedKey(
        privateKey,
        publicKey,
        chainCode,
    );
}

// 从种子生成主密钥
export class ExtendedKey {
    privateKey: Buffer | null ;
    publicKey: Buffer ;
    chainCode: Buffer ;

    constructor(priKey:Buffer, pubKey:Buffer, chainCode:Buffer ) {
        this.privateKey = priKey;
        this.publicKey = pubKey;
        this.chainCode = chainCode;
    }
}
