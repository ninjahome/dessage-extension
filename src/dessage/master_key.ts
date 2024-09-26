import {mnemonicToSeedSync} from "bip39";
import {decryptAes, encryptAes} from "./key_crypto";
import {__tableNameMasterKey, databaseGetByID, upsertItem} from "../database";
import {fromMasterSeed} from "./extended_key";
import {DsgAccount} from "./dsg_account";

const __master_key_static_id = 1;

export class EncryptedSeed {
    cipherTxt: string;
    iv: string;
    salt: string;

    constructor(cipherTxt: string, iv: string, salt: string) {
        this.cipherTxt = cipherTxt;
        this.iv = iv;
        this.salt = salt;
    }
}

class MasterKey {
    id: number = __master_key_static_id;
    seedCipherTxt: EncryptedSeed;
    accIndex: number = 0;

    constructor(cipherTxt: EncryptedSeed, accIndex?: number) {
        this.seedCipherTxt = cipherTxt;
        this.accIndex = accIndex ?? 0;
    }

    async saveToDb() {
        return await upsertItem(__tableNameMasterKey, this)
    }

    unlock(pwd: string): Map<string, DsgAccount> {

        const decryptedSeedStr = decryptAes(this.seedCipherTxt, pwd);
        const seedBuffer = Buffer.from(decryptedSeedStr, 'hex');
        // console.log("--------------->>>>>>seed load:=>",seedBuffer.toString('hex'))
        const seedKey = fromMasterSeed(seedBuffer);
        //
        // console.log('主私钥 (Master Private Key):', seedKey.privateKey!.toString('hex'));
        // console.log('主公钥 (Master Private Key):', seedKey.publicKey!.toString('hex'));
        const outerWallet = new Map();
        for (let i = 0; i <= this.accIndex; i++) {
            const account = new DsgAccount(seedKey, i)
            outerWallet.set(account.address, account);
        }

        return outerWallet;
    }
}

export function NewMasterKey(mnemonic: string, password: string): MasterKey {
    const seed = mnemonicToSeedSync(mnemonic);
    // console.log("--------------->>>>>>seed created:=>",seed.toString('hex'))
    const seedTxt = encryptAes(seed.toString('hex'), password);
    return new MasterKey(seedTxt);
}

export async function loadMasterKey(): Promise<MasterKey | null> {

    const key_obj = await databaseGetByID(__tableNameMasterKey, __master_key_static_id)
    if (!key_obj) {
        return null;
    }

    return new MasterKey(key_obj.seedCipherTxt, key_obj.accIndex);
}
