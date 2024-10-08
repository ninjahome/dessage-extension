/// <reference lib="webworker" />
import browser, {Runtime} from "webextension-polyfill";
import {
    __key_master_key_status,
    __key_system_setting,
    loadSystemSetting,
    MasterKeyStatus,
    MsgType,
    queryEthBalance,
    sessionGet,
    sessionRemove,
    sessionSet
} from './common';
import {checkAndInitDatabase, closeDatabase} from './database';
import {loadMasterKey, MasterKey} from "./dessage/master_key";
import {Address} from "./dessage/address";
import {DsgKeyPair} from "./dessage/dsg_keypair";

const __timeOut: number = 6 * 60 * 60 * 1000;
const __key_last_touch: string = '__key_last_touch__';
const __alarm_name__: string = '__alarm_name__timer__';
const __key_master_key: string = '__key_master_key__';
const __key_sub_account_prefix: string = '__key_sub_account_prefix__';
export const __key_sub_account_address_list: string = '__key_sub_account_list__';

const runtime = browser.runtime;
const alarms = browser.alarms;
const tabs = browser.tabs;
type ResponseFunc = (response: any) => void
export const wrapKeyPairKey = (address: string) => __key_sub_account_prefix + address;

self.addEventListener('install', () => {
    console.log('[service work] Service Worker installing...');
    createAlarm().then(() => {
    });
});

self.addEventListener('activate', (event) => {
    const extendableEvent = event as ExtendableEvent;
    extendableEvent.waitUntil((self as unknown as ServiceWorkerGlobalScope).clients.claim());
    console.log('[service work] Service Worker activating......');
});

async function createAlarm(): Promise<void> {
    const alarm = await alarms.get(__alarm_name__);
    if (!alarm) {
        alarms.create(__alarm_name__, {
            periodInMinutes: 1
        });
    }
}

alarms.onAlarm.addListener(timerTaskWork);

async function timerTaskWork(alarm: any): Promise<void> {
    let walletStatus = await sessionGet(__key_master_key_status) || MasterKeyStatus.Init;
    let keyLastTouch = await sessionGet(__key_last_touch) || 0;

    if (alarm.name === __alarm_name__) {
        console.log("[service work] Alarm Triggered!");
        if (walletStatus !== MasterKeyStatus.Unlocked) {
            console.log("[service work] No unlocked wallet");
            return
        }
        queryBalance().then();
        console.log("[service work] time out:", keyLastTouch, __timeOut, "now:", Date.now());
        if (keyLastTouch + __timeOut < Date.now()) {
            console.log('[service work] time out to close wallet...');
            await closeWallet();
        }
    }
}

async function queryBalance(): Promise<void> {

    const ss = await loadSystemSetting();
    if (!ss.address) {
        console.log("[service work] no active wallet right now");
        return;
    }
    const keyPairStr = await sessionGet(wrapKeyPairKey(ss.address));
    if (!keyPairStr) {
        console.log("[service work] no key pair found for address=>", ss.address);
        return;
    }
    const keyPair = JSON.parse(keyPairStr) as DsgKeyPair;
    if (!keyPair) {
        console.log("[service work] parse key pair failed from string:", keyPairStr);
        return;
    }

    queryEthBalance(keyPair.address.ethAddr);
}

async function closeWallet(): Promise<void> {
    await sessionRemove(__key_master_key);
    await sessionRemove(__key_master_key_status);
    await sessionRemove(__key_last_touch);
    await sessionRemove(__key_sub_account_prefix);
    await sessionRemove(__key_sub_account_address_list);
    await sessionRemove(__key_system_setting);
}

async function cacheHDAccounts(masterKey: MasterKey): Promise<string> {

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

    return objStr;
}

async function openMasterKey(pwd: string, sendResponse: ResponseFunc): Promise<void> {
    try {
        await checkAndInitDatabase();
        const masterKey = await loadMasterKey();
        if (!masterKey) {
            sendResponse({status: false, message: "no valid account found"});
            return;
        }

        masterKey.unlock(pwd);
        await sessionSet(__key_master_key, JSON.stringify(masterKey));
        await sessionSet(__key_master_key_status, MasterKeyStatus.Unlocked);
        await sessionSet(__key_last_touch, Date.now());

        const objStr = await cacheHDAccounts(masterKey);
        console.log(`[service work] string size=${objStr.length}`);

        sendResponse({status: true, message: objStr});
    } catch (error) {
        const err = error as Error;
        console.log('[service work] Error in open wallet:', err);
        let msg = err.toString();
        if (msg.includes("Malformed") || msg.includes("bad size")) {
            msg = "invalid password";
        }
        sendResponse({status: false, message: msg});
    }
}

async function setActiveWallet(address: string, sendResponse: ResponseFunc): Promise<void> {
    try {

        const ss = await loadSystemSetting();
        ss.address = address;

        await sessionSet(__key_system_setting, ss);
        await ss.syncToDB();

        sendResponse({status: true, message: 'success'});

    } catch (error) {
        console.error('[service work] Error in setActiveWallet:', error);
        sendResponse({status: false, message: error});
    }
}

runtime.onInstalled.addListener((details: Runtime.OnInstalledDetailsType) => {
    console.log("[service work] onInstalled event triggered......");
    if (details.reason === "install") {
        tabs.create({
            url: runtime.getURL("home.html#onboarding/welcome")
        }).then(() => {
        });
    }
});

runtime.onStartup.addListener(() => {
    console.log('[service work] Service Worker onStartup......');
});

runtime.onSuspend.addListener(() => {
    console.log('[service work] Browser is shutting down, closing IndexedDB...');
    closeDatabase();
});

async function createNewKey(sendResponse: ResponseFunc) {

    let walletStatus = await sessionGet(__key_master_key_status) || MasterKeyStatus.Init;
    if (walletStatus !== MasterKeyStatus.Unlocked) {
        sendResponse({status: false, message: "unlocked account first"});
        return;
    }

    const masterKeyStr = await sessionGet(__key_master_key);
    if (!masterKeyStr) {
        sendResponse({status: false, message: "no master key found"});
        return;
    }

    try {
        const masterKey = JSON.parse(masterKeyStr) as MasterKey;
        if (!masterKey.seedKey) {
            sendResponse({status: false, message: "no seed of master key found"});
            return;
        }

        const keyPair = new DsgKeyPair(masterKey.seedKey, masterKey.accountSize + 1);
        await sessionSet(wrapKeyPairKey(keyPair.address.dsgAddr), JSON.stringify(keyPair));

        const addrListStr = await sessionGet(__key_sub_account_address_list);
        const addrList = JSON.parse(addrListStr) as Address[];
        addrList.push(keyPair.address);
        await sessionSet(__key_sub_account_address_list, JSON.stringify(addrList));

        masterKey.accountSize += 1;

        await sessionSet(__key_master_key, JSON.stringify(masterKey));
        await masterKey.saveToDb();

        const ss = await loadSystemSetting();
        await ss.changeAddr(keyPair.address.dsgAddr);

    } catch (e) {
        const err = e as Error;
        sendResponse({status: false, message: err.message});
    }
}

runtime.onMessage.addListener((request: any, sender: Runtime.MessageSender, sendResponse: (response?: any) => void): true | void => {
    console.log("[service work] action :=>", request.action, sender.tab, sender.url);

    switch (request.action) {

        case MsgType.OpenMasterKey:
            openMasterKey(request.password, sendResponse).then();
            return true;

        case MsgType.CloseMasterKey:
            closeWallet().then();
            return true;

        case MsgType.SetActiveAccount:
            setActiveWallet(request.address, sendResponse).then();
            return true;

        case MsgType.OpenPopMainPage:
            browser.action.openPopup().then(() => {
                sendResponse({success: true});
            }).catch((error) => {
                console.error("[service work] openPopup action failed:", error);
                sendResponse({success: false, error: error.message});
            });
            return true;

        case MsgType.NewSubAccount:
            createNewKey(sendResponse).then();
            return true;

        default:
            sendResponse({status: 'unknown action'});
            return;
    }
});