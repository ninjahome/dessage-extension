import {DbWallet} from "./dessage/wallet";
import * as QRCode from 'qrcode';
import {__tableNameWallet, checkAndInitDatabase, databaseAddItem, databaseQueryAll, databaseUpdate} from "./database";
import browser from "webextension-polyfill";
import {loadSystemSettingFromDB, SysSetting} from "./main_common";
import {loadMasterKey} from "./dessage/master_key";

const storage = browser.storage;
const INFURA_PROJECT_ID: string = 'eced40c03c2a447887b73369aee4fbbe';

export enum MasterKeyStatus {
    Init = 'Init',
    NoWallet = 'NoWallet',
    Locked = 'Locked',
    Unlocked = 'Unlocked',
    Expired = 'Expired',
}

export enum MsgType {
    OpenMasterKey = 'OpenMasterKey',
    CloseMasterKey = 'CloseMasterKey',
    SetActiveAccount = 'SetActiveAccount',
    OpenPopMainPage = 'OpenPopMainPage',
    NewSubAccount = 'NewSubAccount',
}

export function showView(hash: string, callback: (hash: string) => void): void {
    const views = document.querySelectorAll<HTMLElement>('.view');
    views.forEach(view => view.style.display = 'none');

    const id = hash.replace('#onboarding/', 'view-');
    const targetView = document.getElementById(id);
    if (targetView) {
        targetView.style.display = 'block';
    }
    callback(hash);
}

export async function saveWallet(w: DbWallet): Promise<void> {
    try {
        const result = await databaseAddItem(__tableNameWallet, w);
        console.log("save wallet result=>", result, w.uuid);
        w.updateName(result as string);
        await databaseUpdate(__tableNameWallet, result, w);
    } catch (error) {
        console.error("Error saving wallet:", error);
    }
}

export async function loadLocalWallet(): Promise<DbWallet[]> {
    const wallets = await databaseQueryAll(__tableNameWallet);
    if (!wallets) {
        return [];
    }
    const walletObj: DbWallet[] = [];
    for (const dbWallet of wallets) {
        console.log("load wallet success:=>", dbWallet.address);
        walletObj.push(dbWallet);
    }
    return walletObj;
}

export async function createQRCodeImg(data: string) {
    try {
        const url = await QRCode.toDataURL(data, {errorCorrectionLevel: 'H'});
        console.log('Generated QR Code:', url);
        return url;
    } catch (error) {
        console.error('Error generating QR Code:', error);
        return null
    }
}

export async function sessionSet(key: string, value: any): Promise<void> {
    try {
        await storage.session.set({[key]: value});
    } catch (error: unknown) {
        const err = error as Error;
        console.error("[service work] Failed to set value:", err);
    }
}

export async function sessionGet(key: string): Promise<any> {
    try {
        const result = await storage.session.get(key);
        return result[key];
    } catch (error: unknown) {
        const err = error as Error;
        console.error("[service work] Failed to get value:", err);
        return null;
    }
}

export async function sessionRemove(key: string): Promise<void> {
    try {
        await storage.session.remove(key);
        // console.log("[service work] Value was removed successfully.");
    } catch (error) {
        console.error("[service work] Failed to remove value:", error);
    }
}

function observeAction(target: HTMLElement, idleThreshold: number,
                       foundFunc: () => HTMLElement | null, callback: () => Promise<void>,
                       options: MutationObserverInit, continueMonitor?: boolean) {
    const cb: MutationCallback = (mutationsList, observer) => {
        const element = foundFunc();
        if (!element) {
            return;
        }
        if (!continueMonitor) {
            observer.disconnect();
        }
        let idleTimer = setTimeout(() => {
            callback().then();
            clearTimeout(idleTimer);
            console.log('---------->>> observer action finished:=> continue=>', continueMonitor);
        }, idleThreshold);
    };

    const observer = new MutationObserver(cb);
    observer.observe(target, options);
}

export function observeForElement(target: HTMLElement, idleThreshold: number,
                                  foundFunc: () => HTMLElement | null, callback: () => Promise<void>,
                                  continueMonitor?: boolean) {

    observeAction(target, idleThreshold, foundFunc, callback, {childList: true, subtree: true}, continueMonitor);
}

export function observeForElementDirect(target: HTMLElement, idleThreshold: number,
                                        foundFunc: () => HTMLElement | null, callback: () => Promise<void>,
                                        continueMonitor?: boolean) {
    observeAction(target, idleThreshold, foundFunc, callback, {childList: true, subtree: false}, continueMonitor);
}


export function queryEthBalance(ethAddr:string){
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

export async function loadSystemSetting(): Promise<SysSetting> {

    const settingString = await sessionGet(__key_system_setting);
    if (settingString) {
        return JSON.parse(settingString) as SysSetting;
    }

    const obj = await loadSystemSettingFromDB();
    await sessionSet(__key_system_setting, JSON.stringify(obj));

    return obj;
}

export const __key_system_setting: string = '__key_system_setting__';
export const __key_master_key_status: string = '__key_account_status__';

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