import {mnemonicToSeedSync} from "bip39";
import {deriveChild, derivePath, fromMasterSeed} from "./dessage/extended_key";
import {loadMasterKey, NewMasterKey} from "./dessage/master_key";
import {__tableNameMasterKey, databaseDelete} from "./database";
import {decryptAes} from "./dessage/key_crypto";

// 测试 BIP44 派生路径（完整路径派生）
export function testBip44() {
    const mnemonic = "state motion recall collect wire hold tiny occur flock depend slush hurdle";
    const seed = mnemonicToSeedSync(mnemonic);

    // 生成主密钥和链码
    const masterKey = fromMasterSeed(seed);

    console.log('主私钥 (Master Private Key):', masterKey.privateKey!.toString('hex'));

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

    const dsgKey = derivePath(masterKey, "m/44'/1286'/0'/0/0");
    console.log('DSG 子私钥1 (Child Private Key):', dsgKey.privateKey?.toString('hex'));
    console.log('DSG 子公钥1 (Child Public Key):', dsgKey.publicKey.toString('hex'));
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

export async function testNewMasterKey() {
    const mnemonic = "state motion recall collect wire hold tiny occur flock depend slush hurdle";
    const masterKey = NewMasterKey(mnemonic, '123');
    const result = await masterKey.saveToDb();
    console.log("-------->>>result:", result, masterKey)
    await databaseDelete(__tableNameMasterKey, masterKey.id);
}

export async function testRemoveMasterKey() {
    await databaseDelete(__tableNameMasterKey, 1);
}

export async function testMasterKeySeed() {
    const mnemonic = "state motion recall collect wire hold tiny occur flock depend slush hurdle";
    const masterKey = NewMasterKey(mnemonic, '123');
    await masterKey.saveToDb();
    const savedKey = await loadMasterKey();
    savedKey?.unlock('123');
}

export async function testEncrypt() {
    const mnemonic = "state motion recall collect wire hold tiny occur flock depend slush hurdle";
    const masterKey = NewMasterKey(mnemonic, '123');
    console.log("------------>>>>>", masterKey.seedCipherTxt);

    const decryptedSeed = decryptAes(masterKey.seedCipherTxt, '123');
    console.log("------------>>>>>", decryptedSeed);
}