import {mnemonicToSeedSync} from "bip39";
import {encryptAes} from "./key_crypto";
import {__tableNameMasterKey, __tableNameWallet, databaseAddItem, databaseGetByID, upsertItem} from "../database";

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
}

export function NewMasterKey(mnemonic: string, password: string): MasterKey {
    const seedBuffer = mnemonicToSeedSync(mnemonic);
    const seedTxt = encryptAes(seedBuffer.subarray(0, 32).toString('hex'), password);
    return new MasterKey(seedTxt);
}

export async function loadMasterKey(): Promise<MasterKey | null> {

    const key_obj = await databaseGetByID(__tableNameMasterKey, __master_key_static_id)
    if (!key_obj) {
        return null;
    }

    return new MasterKey(key_obj.seedCipherTxt, key_obj.accIndex);
}