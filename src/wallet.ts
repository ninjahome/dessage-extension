// wallet.ts

import { generateMnemonic as bip39GenerateMnemonic, mnemonicToSeedSync } from 'bip39';
import { Buffer } from 'buffer'; // 导入 buffer 包
import { ec as EC } from 'elliptic';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import CryptoJS from 'crypto-js';
import { bech32 } from 'bech32';
import { TransactionFactory, TypedTransaction } from '@ethereumjs/tx';
import { Common, Chain, Hardfork } from '@ethereumjs/common';
import {bufferToHex, keccak256} from 'ethereumjs-util';

interface MnemonicResult {
    mnemonic: string;
    seed: string;
}

export async function generateMnemonic(): Promise<MnemonicResult> {
    // 生成助记词
    const mnemonic = bip39GenerateMnemonic();
    console.log('Generated mnemonic:', mnemonic);

    // 将助记词转换为种子
    const seedBuffer = mnemonicToSeedSync(mnemonic); // 使用同步方法
    const seed = Buffer.from(seedBuffer).toString('hex'); // 转换为 Buffer 以便于操作
    console.log('Seed:', seed);

    return {
        mnemonic,
        seed
    };
}
// 生成密钥对的函数
export function generateKey() {
    // 创建一个新的 EC 实例
    const ec = new EC('secp256k1');

    // 生成一个新的密钥对
    const keyPair = ec.genKeyPair();

    // 获取公钥和私钥
    const publicKey = keyPair.getPublic('hex');
    const privateKey = keyPair.getPrivate('hex');

    return { publicKey, privateKey };
}

// 生成 Base58 编码和解码的函数
export function generateBase58(input: string) {
    // 编码
    const bytes = Buffer.from(input);
    const encoded = bs58.encode(bytes);

    // 解码
    const decodedBytes = bs58.decode(encoded);
    const decoded = Buffer.from(decodedBytes).toString(); // 使用 Buffer 转换为字符串

    return { encoded, decoded };
}

// 生成 NaCl 密钥对并进行加密和解密的函数
export function generateNaclKey(message: string) {
    // 生成密钥对
    const keyPair = nacl.box.keyPair();

    // 编码消息
    const messageUint8 = naclUtil.decodeUTF8(message);
    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    // 加密
    const encryptedMessage = nacl.box(messageUint8, nonce, keyPair.publicKey, keyPair.secretKey);

    // 解密
    const decryptedMessage = nacl.box.open(encryptedMessage, nonce, keyPair.publicKey, keyPair.secretKey);

    // 如果解密成功，将其转换为 UTF-8 字符串
    const decodedMessage = decryptedMessage ? naclUtil.encodeUTF8(decryptedMessage) : null;

    return {
        publicKey: naclUtil.encodeBase64(keyPair.publicKey),
        secretKey: naclUtil.encodeBase64(keyPair.secretKey),
        nonce: naclUtil.encodeBase64(nonce),
        encryptedMessage: naclUtil.encodeBase64(encryptedMessage),
        decodedMessage: decodedMessage
    };
}


export function encryptAes(plainTxt: string, password: string) {
    const salt = CryptoJS.lib.WordArray.random(128 / 8);
    const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 1000
    });
    const iv = CryptoJS.lib.WordArray.random(128 / 8);
    const encrypted = CryptoJS.AES.encrypt(plainTxt, key, { iv: iv });

    return {
        cipherTxt: encrypted.toString(),
        iv: iv.toString(),
        salt: salt.toString()
    };
}

export function decryptAes(encryptedData: { cipherTxt: string; iv: string; salt: string }, password: string) {
    const salt = CryptoJS.enc.Hex.parse(encryptedData.salt);
    const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);
    const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 1000
    });
    const decrypted = CryptoJS.AES.decrypt(encryptedData.cipherTxt, key, { iv: iv });

    return decrypted.toString(CryptoJS.enc.Utf8);
}

// 封装 bech32 使用逻辑的函数
export function encodeBech32(input: string) {
    const words = bech32.toWords(Buffer.from(input, 'utf8'));
    const encoded = bech32.encode('NJ', words);

    return encoded;
}

export function decodeBech32(encoded: string) {
    const { prefix, words } = bech32.decode(encoded);
    const decoded = Buffer.from(bech32.fromWords(words)).toString('utf8');

    return { prefix, decoded };
}

// 封装 ethereumjs-util 使用逻辑的函数
// 将普通字符串转换为 Buffer
function stringToBuffer(input: string): Buffer {
    return Buffer.from(input, 'utf8');
}

// 封装 ethereumjs-util 使用逻辑的函数
export function generateEthereumHash(input: string): string {
    const buffer = stringToBuffer(input);
    const hash = keccak256(buffer);
    const hashHex = bufferToHex(hash);
    return hashHex;
}


// 封装 ethereumjs-tx 使用逻辑的函数
export function createEthereumTransaction(privateKeyHex: string, to: string, value: string, gasLimit: number, gasPrice: number): string {
    const privateKey = Buffer.from(privateKeyHex, 'hex');

    // 定义交易参数
    const txParams = {
        nonce: '0x00',
        gasPrice: '0x' + gasPrice.toString(16),
        gasLimit: '0x' + gasLimit.toString(16),
        to: to,
        value: '0x' + BigInt(value).toString(16),
        data: '0x00',
    };

    // 创建 Common 对象
    const common = Common.custom({ chainId: 1, networkId: 1 }, { hardfork: Hardfork.Istanbul });

    // 创建交易对象
    const tx = TransactionFactory.fromTxData(txParams, { common });

    // 签名交易
    const signedTx = tx.sign(privateKey as Buffer);

    const serializedTx = Buffer.from(signedTx.serialize());

    return bufferToHex(serializedTx);
}
