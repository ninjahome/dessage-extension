import HmacSHA512 from 'crypto-js/hmac-sha512';
import { ec as EC } from 'elliptic';
import Hex from 'crypto-js/enc-hex';
import WordArray from 'crypto-js/lib-typedarrays';
import {mnemonicToSeedSync} from "bip39";

const ec = new EC('secp256k1');

interface MasterKey {
    privateKey: Buffer | null;
    publicKey: Buffer;  // 添加公钥
    chainCode: Buffer;
}

// 从主密钥派生子密钥
export function deriveChild(privateKey: Buffer | null, publicKey: Buffer, chainCode: Buffer, index: number): MasterKey {
    const indexBuffer = Buffer.allocUnsafe(4);
    indexBuffer.writeUInt32BE(index, 0);

    let data: Buffer;
    if (index >= 0x80000000) {
        // 硬化派生，使用父私钥
        if (privateKey === null) {
            throw new Error('无法从公钥硬化派生');
        }
        data = Buffer.concat([Buffer.alloc(1, 0), privateKey, indexBuffer]);
    } else {
        // 非硬化派生，使用公钥
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
        // 使用 elliptic 曲线计算新的子私钥：childPrivateKey = parentPrivateKey + Il (mod n)
        const key = ec.keyFromPrivate(privateKey);
        const tweakKey = ec.keyFromPrivate(IL);
        const childPrivate = key.getPrivate().add(tweakKey.getPrivate()).mod(ec.curve.n);
        childPrivateKey = Buffer.from(childPrivate.toArray('be', 32));

        // 生成子公钥
        const childKey = ec.keyFromPrivate(childPrivateKey);
        childPublicKey = Buffer.from(childKey.getPublic(true, 'array'));  // 压缩公钥
    } else {
        // 使用父公钥派生子公钥
        const parentPubKey = ec.keyFromPublic(publicKey);
        const ilPoint = ec.g.mul(IL);
        const childPubKey = parentPubKey.getPublic().add(ilPoint);
        childPublicKey = Buffer.from(childPubKey.encodeCompressed());  // 压缩公钥
    }

    return {
        privateKey: childPrivateKey,
        publicKey: childPublicKey,
        chainCode: IR, // 新链码
    };
}

// 从种子生成主密钥
function fromMasterSeed(seed: Buffer): MasterKey {
    const hmac = HmacSHA512(WordArray.create(seed), 'Bitcoin seed');
    const I = Buffer.from(hmac.toString(Hex), 'hex');
    const privateKey = I.subarray(0, 32);
    const key = ec.keyFromPrivate(privateKey);
    const publicKey = Buffer.from(key.getPublic(true, 'array'));  // 压缩公钥
    const chainCode = I.subarray(32);
    return {
        privateKey,
        publicKey,
        chainCode,
    };
}

// 测试 BIP44 派生路径（完整路径派生）
export function testBip44() {
    const mnemonic = "state motion recall collect wire hold tiny occur flock depend slush hurdle";
    const seed = mnemonicToSeedSync(mnemonic);

    // 生成主密钥和链码
    const masterKey = fromMasterSeed(seed);

    console.log('主私钥 (Master Private Key):', masterKey.privateKey!.toString('hex'));
    console.log('链码 (Chain Code):', masterKey.chainCode.toString('hex'));

    // 生成两个 BTC 私钥
    const btcKey1 = derivePath(masterKey, "m/44'/0'/0'/0/0");
    console.log('BTC 子私钥1 (Child Private Key):', btcKey1.privateKey?.toString('hex'));
    console.log('BTC 子公钥1 (Child Public Key):', btcKey1.publicKey.toString('hex'));

    const btcKey2 = derivePath(masterKey, "m/44'/0'/0'/0/1");
    console.log('BTC 子私钥2 (Child Private Key):', btcKey2.privateKey?.toString('hex'));
    console.log('BTC 子公钥2 (Child Public Key):', btcKey2.publicKey.toString('hex'));

    // 生成两个 ETH 私钥
    const ethKey1 = derivePath(masterKey, "m/44'/60'/0'/0/0");
    console.log('ETH 子私钥1 (Child Private Key):', ethKey1.privateKey?.toString('hex'));
    console.log('ETH 子公钥1 (Child Public Key):', ethKey1.publicKey.toString('hex'));

    const ethKey2 = derivePath(masterKey, "m/44'/60'/0'/0/1");
    console.log('ETH 子私钥2 (Child Private Key):', ethKey2.privateKey?.toString('hex'));
    console.log('ETH 子公钥2 (Child Public Key):', ethKey2.publicKey.toString('hex'));
}


// 实现 BIP44 派生路径
export function derivePath(masterKey: MasterKey, path: string): MasterKey {
    const segments = path.split('/').slice(1); // 移除 'm'
    let derivedKey = masterKey;

    segments.forEach(segment => {
        let index = parseInt(segment.replace("'", ''), 10);
        if (segment.endsWith("'")) {
            index += 0x80000000; // 硬化派生
        }
        derivedKey = deriveChild(derivedKey.privateKey, derivedKey.publicKey, derivedKey.chainCode, index);
    });

    return derivedKey;
}

// 测试非硬化派生路径（m/0）
export function testNonHardened() {
    const mnemonic = "state motion recall collect wire hold tiny occur flock depend slush hurdle";
    const seed = mnemonicToSeedSync(mnemonic);

    // 生成主密钥和链码
    const masterKey = fromMasterSeed(seed);

    console.log('主私钥 (Master Private Key):', masterKey.privateKey!.toString('hex'));
    console.log('链码 (Chain Code):', masterKey.chainCode.toString('hex'));

    // 使用非硬化派生路径 m/0
    const childKey = deriveChild(masterKey.privateKey, masterKey.publicKey, masterKey.chainCode, 0);

    // 输出子私钥和子公钥
    console.log('子私钥2 (Child Private Key):', childKey.privateKey?.toString('hex'));
    console.log('子公钥 (Child Public Key):', childKey.publicKey.toString('hex'));
}
