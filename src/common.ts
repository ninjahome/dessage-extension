import {DbWallet} from "./dessage/wallet";
import {__tableNameWallet, databaseAddItem, databaseQueryAll} from "./database";

export enum WalletStatus {
    Init = 'Init',
    NoWallet = 'NoWallet',
    Locked = 'Locked',
    Unlocked = 'Unlocked',
    Expired = 'Expired',
    Error = 'error'
}

export enum MsgType {
    PluginClicked = 'PluginClicked',
    WalletOpen = 'WalletOpen',
    WalletClose = 'WalletClose',
    WalletCreated = 'WalletCreated',
    SetActiveWallet = 'SetActiveWallet'
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
    const result = await databaseAddItem(__tableNameWallet, w);
    console.log("save wallet result=>", result);
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