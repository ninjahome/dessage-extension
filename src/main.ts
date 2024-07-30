import {initDatabase} from "./database";
import browser from "webextension-polyfill";
import {MsgType, showView, WalletStatus} from './common';
import {MultiAddress} from "./dessage/multi_addr";

class SysSetting {
    id: string;
    address: string;
    network: string;

    constructor(id: string, addr: string, network: string) {
        this.id = id;
        this.address = addr;
        this.network = network;
    }
}

let __walletMap: Map<string, MultiAddress> = new Map();

document.addEventListener("DOMContentLoaded", initDessagePlugin as EventListener);

async function initDessagePlugin(): Promise<void> {
    await initDatabase();
    checkBackgroundStatus();
    initLoginDiv();
    initDashBoard();
}

function initDashBoard(): void {
    const selectElement = document.getElementById("wallet-dropdown") as HTMLSelectElement;
        selectElement.addEventListener('change', function (event: Event) {
            const target = event.target as HTMLSelectElement;
            const selectedValue = target.value;
            console.log('------>>>selected value:', selectedValue);
            setupWalletArea(selectedValue);
        });

}

function setupWalletArea(selectedValue: string): void {
    // Your implementation here
}

function checkBackgroundStatus(): void {
    const request = {action: MsgType.PluginClicked};

    browser.runtime.sendMessage(request).then((response: any) => {
        console.log("request=>", JSON.stringify(request));
        if (!response) {
            console.error('Error: Response is undefined or null.');
            return;
        }
        console.log("------>>>response=>", JSON.stringify(response));

        switch (response.status) {
            case WalletStatus.NoWallet:
                browser.tabs.create({
                    url: browser.runtime.getURL("home.html#onboarding/welcome")
                }).then(() =>{} );
                return;
            case WalletStatus.Locked:
            case WalletStatus.Expired:
                showView('#onboarding/unlock-plugin', router);
                return;
            case WalletStatus.Unlocked:
                const obj = JSON.parse(response.message);
                __walletMap = new Map<string, any>(Object.entries(obj));
                console.log("------------>>>", __walletMap.size);
                showView('#onboarding/dashboard', router);
                return;
            case WalletStatus.Error:
                alert("error:" + response.message);
                return;
        }
    }).catch((error: any) => {
        console.error('Error sending message:', error);
    });
}

function populateDashboard() {

}

function router(path: string): void {
    if (path === '#onboarding/dashboard') {
        populateDashboard();
    }
}


function initLoginDiv(): void {
    const button = document.querySelector(".login-container .primary-button") as HTMLButtonElement;
    button.addEventListener('click', openAllWallets);
}

function openAllWallets(): void {
    const inputElement = document.querySelector(".login-container input") as HTMLInputElement;
    const password = inputElement.value;

    browser.runtime.sendMessage({action: MsgType.WalletOpen, password: password}).then((response: {
        status: boolean;
        message: string
    }) => {
        if (response.status) {
            const obj = JSON.parse(response.message);
            console.log("------------>>>", response.message, obj);
            __walletMap = new Map<string, MultiAddress>(Object.entries(obj));
            showView('#onboarding/dashboard', router);
            return;
        }
        const errTips = document.querySelector(".login-container .login-error") as HTMLElement;
        errTips.innerText = response.message;
    }).catch(error => {
        console.error('Error sending message:', error);
    });
}
