import {mnemonicToSeedSync} from "bip39";
import {decryptAes, encryptAes} from "./key_crypto";
import {__tableNameMasterKey, databaseGetByID, upsertItem} from "../database";
import {fromMasterSeed} from "./extended_key";
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

class MasterKey {
    id: number = __master_key_static_id;
    seedCipherTxt: EncryptedSeed;
    accountSize: number = 1;
    publicKey: string;

    constructor(cipherTxt: EncryptedSeed, accountSize: number, publicKey?: string) {
        this.seedCipherTxt = cipherTxt;
        this.accountSize = accountSize;
        this.publicKey = publicKey ?? "";
    }

    async saveToDb() {
        return await upsertItem(__tableNameMasterKey, this)
    }

    unlock(pwd: string): Map<string, DsgKeyPair> {

        const decryptedSeedStr = decryptAes(this.seedCipherTxt, pwd);
        const seed = Buffer.from(decryptedSeedStr, 'hex');

        const seedKey = fromMasterSeed(seed);
        if (seedKey.publicKey.toString('hex') !== this.publicKey) {
            throw new Error('invalid password');
        }

        const keyPairMap = new Map();
        for (let i = 0; i < this.accountSize; i++) {
            const keyPair = new DsgKeyPair(seedKey, i)
            keyPairMap.set(keyPair.address.dsgAddr, keyPair);
        }

        return keyPairMap;
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
