/// <reference lib="webworker" />
import browser, {Runtime} from "webextension-polyfill";
import {
    MsgType,
    queryEthBalance,
    sessionGet,
} from './common';
import {closeDatabase} from './database';
import {DsgKeyPair} from "./dessage/dsg_keypair";
import {keyTouchStatus, closeWallet} from "./main_key";
import {loadSystemSetting} from "./main_setting";

const __timeOut: number = 6 * 60 * 60 * 1000;
const __alarm_key_status: string = '__alarm_key_status__';

const runtime = browser.runtime;
const alarms = browser.alarms;
const tabs = browser.tabs;

type ResponseFunc = (response: any) => void
export const __key_sub_account_prefix: string = '__key_sub_account_prefix__';
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
    const alarm = await alarms.get(__alarm_key_status);
    if (!alarm) {
        alarms.create(__alarm_key_status, {
            periodInMinutes: 1
        });
    }
}

alarms.onAlarm.addListener(timerTaskWork);

async function timerTaskWork(alarm: any): Promise<void> {
    switch (alarm.name) {
        case __alarm_key_status:
            let keyLastTouch = await keyTouchStatus();
            if (keyLastTouch <= 0) {
                return;
            }

            console.log("[service work] time out:", keyLastTouch, __timeOut, "now:", Date.now());
            queryBalance().then();
            if (keyLastTouch + __timeOut < Date.now()) {
                console.log('[service work] time out to close wallet...');
                await closeWallet();
            }
            return;
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
        case MsgType.QueryBindings:
            queryBindingsByDsgAddr(request.dsgAddr, sendResponse).then();
            return true;

        case MsgType.PopupMainPage:
            browser.action.openPopup().then();
            return true;

        default:
            sendResponse({status: 'unknown action'});
            return;
    }
});

async function queryBindingsByDsgAddr(dsgAddr: string, sendResponse: ResponseFunc) {
    console.log(`[service work] queryBindingsByDsgAddr:${dsgAddr}`);
}