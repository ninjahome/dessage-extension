/// <reference lib="webworker" />
import browser, {Runtime} from "webextension-polyfill";
import {MasterKeyStatus, MsgType, sessionGet, sessionRemove, sessionSet} from './common';
import {checkAndInitDatabase, closeDatabase} from './database';
import {loadMasterKey} from "./dessage/master_key";

const __timeOut: number = 6 * 60 * 60 * 1000;
const INFURA_PROJECT_ID: string = 'eced40c03c2a447887b73369aee4fbbe';
const __key_master_key_status: string = '__key_account_status__';
const __key_key_pair_map: string = '__key_wallet_map__';
const __key_last_touch: string = '__key_last_touch__';
const __alarm_name__: string = '__alarm_name__timer__';
let __curActiveWallet: any = null;

const runtime = browser.runtime;
const alarms = browser.alarms;
const tabs = browser.tabs;


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
        queryBalance();
        console.log("[service work] time out:", keyLastTouch, __timeOut, "now:", Date.now());
        if (keyLastTouch + __timeOut < Date.now()) {
            console.log('[service work] time out to close wallet...');
            await closeWallet();
        }
    }
}

function queryBalance(): void {
    if (!__curActiveWallet || !__curActiveWallet.ethAddr) {
        console.log("[service work] no active wallet right now");
        return;
    }

    const ethAddr = __curActiveWallet.ethAddr;
    console.log(`start to query eth[${ethAddr}] balance for:`);
    fetch(`https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [ethAddr, 'latest'],
            id: 1
        })
    }).then(response => response.json())
        .then(result => {
            if (result.error) {
                console.error('[service work] Error:', result.error.message);
            } else {
                const balanceInWei = result.result;
                const balanceInEth = parseInt(balanceInWei, 16) / (10 ** 18);
                console.log(`[service work] Address: ${ethAddr}`, `Balance: ${balanceInEth} ETH`);
            }
        })
        .catch(error => {
            console.error('[service work] Ping failed:', error);
        });
}

async function closeWallet(): Promise<void> {
        await sessionRemove(__key_key_pair_map);
        await sessionRemove(__key_master_key_status);
        await sessionRemove(__key_last_touch);
}

async function pluginClicked(sendResponse: (response: any) => void): Promise<void> {
    try {
        await checkAndInitDatabase();
        // await testEncrypt();

        let msg = '';
        let keyStatus = await sessionGet(__key_master_key_status) || MasterKeyStatus.Init;
        if (keyStatus === MasterKeyStatus.Init) {
            const masterKey = await loadMasterKey();
            if (!masterKey) {
                keyStatus = MasterKeyStatus.NoWallet;
            } else {
                keyStatus = MasterKeyStatus.Locked;
            }
        }

        if (keyStatus === MasterKeyStatus.Unlocked) {
            msg = await sessionGet(__key_key_pair_map);
        }

        sendResponse({status: keyStatus, message: msg});
        await sessionSet(__key_master_key_status, keyStatus);

    } catch (error: unknown) {
        const err = error as Error;
        console.error('[service work] Error in pluginClicked:', err);
        sendResponse({status: MasterKeyStatus.Error, message: err.toString()});
    }
}

async function openMasterKey(pwd: string, sendResponse: (response: any) => void): Promise<void> {
    try {
        await checkAndInitDatabase();
        const masterKey = await loadMasterKey();
        if (!masterKey) {
            sendResponse({status: false, message: "no valid account found"});
            return;
        }

        const allKeyPairs = masterKey?.unlock(pwd);
        const obj = Object.fromEntries(allKeyPairs);
        const objStr = JSON.stringify(obj)

        await sessionSet(__key_master_key_status, MasterKeyStatus.Unlocked);
        await sessionSet(__key_key_pair_map, objStr);
        await sessionSet(__key_last_touch, Date.now());

        console.log(`[service work] all key pair size(${allKeyPairs?.size}) string size=${objStr.length}`);
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

async function setActiveWallet(address: string, sendResponse: (response: any) => void): Promise<void> {
    try {
        const objStr = await sessionGet(__key_key_pair_map);
        const keypairMap = new Map(Object.entries(JSON.parse(objStr)));

        const keypair = keypairMap.get(address);
        console.log("[service work] keypairMap is:", keypairMap, " have a try:", keypair, "for:", address);
        if (!keypair) {
            sendResponse({status: false, message: 'no such outer wallet'});
            return;
        }
        __curActiveWallet = keypair;
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

runtime.onMessage.addListener((request: any, sender: Runtime.MessageSender, sendResponse: (response?: any) => void): true | void => {
    console.log("[service work] action :=>", request.action, sender.tab, sender.url);
    switch (request.action) {
        case MsgType.PluginClicked:
            pluginClicked(sendResponse).then(() => {
            });
            return true;
        case MsgType.OpenMasterKey:
            openMasterKey(request.password, sendResponse).then(() => {
            });
            return true;
        case MsgType.CloseMasterKey:
            closeWallet().then(() => {
            });
            return true;
        case MsgType.SetActiveAccount:
            setActiveWallet(request.address, sendResponse).then(() => {
            });
            return true;

        case MsgType.OpenPopMainPage:
            browser.action.openPopup().then(() => {
                sendResponse({success: true});
            }).catch((error) => {
                console.error("[service work] openPopup action failed:", error);
                sendResponse({success: false, error: error.message});
            });

            return true;
        default:
            sendResponse({status: 'unknown action'});
            return;
    }
});