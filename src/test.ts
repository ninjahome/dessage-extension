
import {generateMnemonic, mnemonicToSeedSync} from "bip39";
import * as hdkey from 'hdkey';
import { publicToAddress } from 'ethereumjs-util';

/*
* 比特币地址一般遵循 BIP44 标准，路径格式为：m / 44' / 0' / account' / change / address_index。其中：

44' 表示 BIP44 标准。
0' 表示比特币。
account' 表示账户号，通常从 0 开始。
change 表示是否是找零地址，0 表示外部地址，1 表示找零地址。
address_index 表示地址的索引号。
*
*
* 以太坊的路径是 m / 44' / 60' / account' / change / address_index，其中 60' 表示以太坊。
* */
export function testBip44(){
    const mnemonic = generateMnemonic();
    console.log("--------------->>>>> mnemonic", mnemonic);
    const seedBuffer = mnemonicToSeedSync(mnemonic);

    const root = hdkey.fromMasterSeed(seedBuffer);

// 生成比特币的私钥和地址
    const btcPath = "m/44'/0'/0'/0/0";
    const btcChild = root.derivePath(btcPath);
    const btcPrivateKey = btcChild.privateKey?.toString('hex');
    console.log(`BTC Private Key: ${btcPrivateKey}`);

// 生成以太坊的私钥
    const ethPath = "m/44'/60'/0'/0/0";
    const ethChild = root.derivePath(ethPath);
    const ethPrivateKey = ethChild.privateKey?.toString('hex');
    console.log(`ETH Private Key: ${ethPrivateKey}`);

// 生成以太坊地址
    const ethAddress = publicToAddress(ethChild.publicKey, true).toString('hex');
    console.log(`ETH Address: 0x${ethAddress}`);
}