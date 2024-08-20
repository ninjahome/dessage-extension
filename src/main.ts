import {__currentDatabaseVersion, __tableSystemSetting, databaseUpdate, getMaxIdRecord, initDatabase} from "./database";
import browser from "webextension-polyfill";
import {MsgType, showView, WalletStatus} from './common';
import {MultiAddress} from "./dessage/protocolKey";

class SysSetting {
    id: number;
    address: string;
    network: string;

    constructor(id: number, addr: string, network: string) {
        this.id = id;
        this.address = addr;
        this.network = network;
    }

    async syncToDB(): Promise<void> {
        await databaseUpdate(__tableSystemSetting, this.id, this);
    }

    async changeAddr(addr: string): Promise<void> {
        this.address = addr;
        await databaseUpdate(__tableSystemSetting, this.id, this);
    }
}

let __systemSetting: SysSetting;
let __walletMap: Map<string, MultiAddress> = new Map();

document.addEventListener("DOMContentLoaded", initDessagePlugin as EventListener);

async function initDessagePlugin(): Promise<void> {
    await initDatabase();
    await loadLastSystemSetting();
    checkBackgroundStatus();
    initLoginDiv();
    initDashBoard();
}

async function loadLastSystemSetting(): Promise<void> {
    const ss = await getMaxIdRecord(__tableSystemSetting);
    if (ss) {
        __systemSetting = new SysSetting(ss.id, ss.address, ss.network);
        return;
    }
    __systemSetting = new SysSetting(__currentDatabaseVersion, '', '');
}

function initDashBoard(): void {
    const selectElement = document.getElementById("wallet-dropdown") as HTMLSelectElement;
    selectElement.addEventListener('change', function (event: Event) {
        const target = event.target as HTMLSelectElement;
        const selectedValue = target.value;
        console.log('------>>>selected value:', selectedValue);
        setupWalletArea(selectedValue).then(() => {
        });
    });


    document.querySelectorAll<HTMLDivElement>('.tab').forEach(tab => {
        tab.addEventListener('click', function(this: HTMLDivElement) {
            document.querySelectorAll<HTMLDivElement>('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll<HTMLDivElement>('.wallet-content-area > div').forEach(content => content.classList.remove('active'));

            this.classList.add('active');
            const targetId = this.dataset.target;
            if (targetId) {
                document.getElementById(targetId)?.classList.add('active');
            }
        });
    });

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
                }).then(() => {
                });
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
    setAccountSwitchArea();
    setupWalletArea(__systemSetting.address).then(() => {
    });
}

function setAccountSwitchArea(): void {
    const selectElement = document.getElementById("wallet-dropdown") as HTMLSelectElement;
    selectElement.innerHTML = '';
    const optionTemplate = document.getElementById("wallet-option-item") as HTMLOptionElement;

    __walletMap.forEach((wallet, addr) => {
        const optionDiv = optionTemplate.cloneNode(true) as HTMLOptionElement;
        optionDiv.style.display = 'block';
        optionDiv.value = wallet.address;
        optionDiv.textContent = wallet.address;
        selectElement.appendChild(optionDiv);
    });

    if (__systemSetting) {
        const selAddr = __systemSetting.address;
        if (selAddr) {
            selectElement.value = selAddr;
        } else {
            selectElement.selectedIndex = 0;
            __systemSetting.address = selectElement.value;
            __systemSetting.syncToDB().then(() => {
            });
        }
    }
}

async function setupWalletArea(addr: string): Promise<void> {
    await __systemSetting.changeAddr(addr);
    notifyBackgroundActiveWallet(__systemSetting.address);
    const wallet = __walletMap.get(addr);
    if (!wallet) {
        console.error('No such addr');
        return;
    }
    setupNinjaDetail(wallet);
    setupEtherArea(wallet);
    setupBtcArea(wallet);
    setupNostr(wallet);
}

function notifyBackgroundActiveWallet(address: string): void {
    browser.runtime.sendMessage({action: MsgType.SetActiveWallet, address: address}).then(response => {
        if (response.status) {
            console.log("set active wallet success");
            return;
        }
        // TODO::show errors to user
        const errTips = document.querySelector(".login-container .login-error") as HTMLElement;
        if (errTips) {
            errTips.innerText = response.message;
        }
    }).catch(error => {
        console.error('Error sending message:', error);
    });
}

function setupNinjaDetail(wallet: MultiAddress): void {
    // 实现细节
}

function setupEtherArea(mulAddr: MultiAddress): void {
    const ethArea = document.getElementById("eth-account-area") as HTMLElement;
    const ethAddressVal = ethArea.querySelector(".eth-address-val") as HTMLElement;
    if (ethAddressVal) {
        ethAddressVal.textContent = mulAddr.ethAddr;
    }
}

function setupBtcArea(mulAddr: MultiAddress): void {
    const btcArea = document.getElementById("btc-account-area") as HTMLElement;
    const btcAddressVal = btcArea.querySelector(".btc-address-val") as HTMLElement;
    if (btcAddressVal) {
        btcAddressVal.textContent = mulAddr.btcAddr;
    }
}

function setupNostr(mulAddr: MultiAddress): void {
    const nostrArea = document.getElementById("nostr-account-area") as HTMLElement;
    const nostrAddressVal = nostrArea.querySelector(".nostr-address-val") as HTMLElement;
    if (nostrAddressVal) {
        nostrAddressVal.textContent = mulAddr.nostrAddr;
    }
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
