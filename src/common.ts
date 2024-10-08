import {DbWallet} from "./dessage/wallet";
import * as QRCode from 'qrcode';
import {__tableNameWallet, databaseAddItem, databaseQueryAll, databaseUpdate} from "./database";
import browser from "webextension-polyfill";
const storage = browser.storage;

export enum MasterKeyStatus {
    Init = 'Init',
    NoWallet = 'NoWallet',
    Locked = 'Locked',
    Unlocked = 'Unlocked',
    Expired = 'Expired',
    Error = 'error'
}

export enum MsgType {
    PluginClicked = 'PluginClicked',
    OpenMasterKey = 'OpenMasterKey',
    CloseMasterKey = 'CloseMasterKey',
    SetActiveAccount = 'SetActiveAccount',
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