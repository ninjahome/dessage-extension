import {mnemonicToSeedSync} from "bip39";
import {decryptAes, encryptAes} from "./key_crypto";
import {__tableNameMasterKey, databaseGetByID, upsertItem} from "../database";
import {ExtendedKey, fromMasterSeed} from "./extended_key";
import {DsgKeyPair} from "./dsg_keypair";

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

export class MasterKey {
    id: number = __master_key_static_id;
    seedCipherTxt: EncryptedSeed;
    accountSize: number = 1;
    publicKey: string;
    seedKey?:ExtendedKey

    constructor(cipherTxt: EncryptedSeed, accountSize: number, publicKey?: string) {
        this.seedCipherTxt = cipherTxt;
        this.accountSize = accountSize;
        this.publicKey = publicKey ?? "";
    }

    async saveToDb() {
        return await upsertItem(__tableNameMasterKey, this)
    }

    unlock(pwd: string) {
        const decryptedSeedStr = decryptAes(this.seedCipherTxt, pwd);
        const seed = Buffer.from(decryptedSeedStr, 'hex');

        const seedKey = fromMasterSeed(seed);
        if (seedKey.publicKey.toString('hex') !== this.publicKey) {
            throw new Error('invalid password');
        }

        this.seedKey = seedKey;
    }

    parseAccountListFromMasterSeed(): DsgKeyPair[] {

        let result: DsgKeyPair[] = [];
        if (!this.seedKey){
            return result;
        }

        for (let i = 0; i < this.accountSize; i++) {
            const keyPair = new DsgKeyPair(this.seedKey, i);
            result.push(keyPair);
        }

        return result;
    }
}

export function NewMasterKey(mnemonic: string, password: string): MasterKey {
    const seed = mnemonicToSeedSync(mnemonic);
    const seedTxt = encryptAes(seed.toString('hex'), password);
    const seedKey = fromMasterSeed(seed);
    return new MasterKey(seedTxt, 1, seedKey.publicKey.toString('hex'));
}

export async function loadMasterKey(): Promise<MasterKey | null> {

    const key_obj = await databaseGetByID(__tableNameMasterKey, __master_key_static_id)
    if (!key_obj) {
        return null;
    }

    return new MasterKey(key_obj.seedCipherTxt, key_obj.accountSize, key_obj.publicKey);
}
