import {
    MasterKeyStatus,
    sessionGet, sessionRemove,
    sessionSet,
} from "./common";
import {loadMasterKey, MasterKey} from "./dessage/master_key";
import {DsgKeyPair} from "./dessage/dsg_keypair";
import {Address} from "./dessage/address";
import {wrapKeyPairKey} from "./background";
import {checkAndInitDatabase} from "./database";
import {loadSystemSetting, updateSetting} from "./main_setting";
import {ExtendedKey} from "./dessage/extended_key";

const __key_last_touch: string = '__key_last_touch__';
const __key_master_key: string = '__key_master_key__';
const __key_sub_account_address_list: string = '__key_sub_account_list__';
const __key_master_key_status: string = '__key_account_status__';

export async function loadAccountList(): Promise<Address[]> {
    const accStr = await sessionGet(__key_sub_account_address_list);
    if (!accStr) {
        return [];
    }
    try {
        return JSON.parse(accStr) as Address[];
    } catch (err) {
        console.log("----->>> load account list failed:", err);
        return [];
    }
}

async function cacheAccountList(masterKey: MasterKey): Promise<void> {

    const allKeyPairs = masterKey.parseAccountListFromMasterSeed();
    console.log(`[service work] all key pair size(${allKeyPairs?.length}) `)

    let accountList: Address[] = []
    for (let i = 0; i < allKeyPairs.length; i++) {
        const keyPair = allKeyPairs[i];
        await sessionSet(wrapKeyPairKey(keyPair.address.dsgAddr), JSON.stringify(keyPair));
        accountList.push(keyPair.address);
    }

    const objStr = JSON.stringify(accountList);
    await sessionSet(__key_sub_account_address_list, objStr);
}

export async function openMasterKey(pwd: string): Promise<void> {
    await checkAndInitDatabase();
    const masterKey = await loadMasterKey();
    if (!masterKey) {
        throw new Error("Master key doesn't exist");
    }

    masterKey.unlock(pwd);
    await sessionSet(__key_master_key, JSON.stringify(masterKey));
    await sessionSet(__key_master_key_status, MasterKeyStatus.Unlocked);
    await sessionSet(__key_last_touch, Date.now());
    await cacheAccountList(masterKey);
}

async function masterKeyFromCache(): Promise<MasterKey> {

    const masterKeyStr = await sessionGet(__key_master_key);
    if (!masterKeyStr) {
        throw new Error("no master key found");
    }

    let obj = JSON.parse(masterKeyStr) as MasterKey;
    if (!obj.seedKey) {
        throw new Error("no seed of master key found");
    }

    const key = new MasterKey(obj.seedCipherTxt, obj.accountSize, obj.publicKey);
    key.seedKey = new ExtendedKey(Buffer.from(obj.seedKey.privateKey),
        Buffer.from(obj.seedKey.publicKey),
        Buffer.from(obj.seedKey.chainCode));

    return key;
}

export async function newNinjaAccount() {

    let walletStatus = await sessionGet(__key_master_key_status) || MasterKeyStatus.Init;
    if (walletStatus !== MasterKeyStatus.Unlocked) {
        throw new Error("unlocked account first");
    }

    const masterKey = await masterKeyFromCache();
    const keyPair = new DsgKeyPair(masterKey.seedKey!, masterKey.accountSize);
    await sessionSet(wrapKeyPairKey(keyPair.address.dsgAddr), JSON.stringify(keyPair));

    const addrListStr = await sessionGet(__key_sub_account_address_list);
    const addrList = JSON.parse(addrListStr) as Address[];
    addrList.push(keyPair.address);
    await sessionSet(__key_sub_account_address_list, JSON.stringify(addrList));

    masterKey.accountSize += 1;

    await sessionSet(__key_master_key, JSON.stringify(masterKey));
    await masterKey.saveToDb();

    const ss = await loadSystemSetting();
    ss.address = keyPair.address.dsgAddr;
    await updateSetting(ss);
}

export async function closeWallet(): Promise<void> {
    await sessionRemove(__key_master_key);
    await sessionRemove(__key_master_key_status);
    await sessionRemove(__key_last_touch);
    await sessionRemove(__key_sub_account_address_list);
}

export async function getKeyStatus(): Promise<MasterKeyStatus> {

    await checkAndInitDatabase();

    let keyStatus = await sessionGet(__key_master_key_status) || MasterKeyStatus.Init;
    if (keyStatus === MasterKeyStatus.Init) {
        const masterKey = await loadMasterKey();
        if (!masterKey) {
            keyStatus = MasterKeyStatus.NoWallet;
        } else {
            keyStatus = MasterKeyStatus.Locked;
        }
    }

    await sessionSet(__key_master_key_status, keyStatus);
    return keyStatus;
}

export async function keyTouchStatus(): Promise<number> {
    let keyStatus = await sessionGet(__key_master_key_status) || MasterKeyStatus.Init;
    if (keyStatus !== MasterKeyStatus.Unlocked) {
        return -1;
    }

    return await sessionGet(__key_last_touch) || 0;
}