import {initDatabase} from "./database";
import browser from "webextension-polyfill";
import {MsgType, showView, MasterKeyStatus} from './common';
import {MultiAddress} from "./dessage/protocolKey";
import {__systemSetting, loadLastSystemSetting} from "./main_common";
import {importNinjaAccount, initDessageArea, newNinjaAccount, setupNinjaDetail} from "./main_ninja";
import {initEthArea, setupEtherArea} from "./main_eth";
import {initBtcArea, setupBtcArea} from "./main_btc";
import {initNostrArea, setupNostr} from "./main_nostr";

document.addEventListener("DOMContentLoaded", initDessagePlugin as EventListener);
export let __walletMap: Map<string, MultiAddress> = new Map();

async function initDessagePlugin(): Promise<void> {
    await initDatabase();
    await loadLastSystemSetting();
    checkBackgroundStatus();
    initLoginDiv();
    initDashBoard();
    initDessageArea();
    initEthArea();
    initBtcArea();
    initNostrArea();
    initQrCodeShowDiv();
}

function initDashBoard(): void {

    const accountListDiv = document.getElementById("account-list-area") as HTMLDivElement;

    const accountListDropDownBtn = document.getElementById("account-list-drop-down-btn") as HTMLButtonElement;
    accountListDropDownBtn.addEventListener("click", async () => {
        accountListDiv.style.display = "block";
    });

    const listCloseBtn = accountListDiv.querySelector(".account-list-header-btn") as HTMLButtonElement;
    listCloseBtn.addEventListener("click", async () => {
        accountListDiv.style.display = "none";
    })

    const newAccBtn = accountListDiv.querySelector(".account-list-new-account") as HTMLButtonElement;
    const importAccBtn = accountListDiv.querySelector(".account-list-import-account") as HTMLButtonElement;
    newAccBtn.addEventListener("click", async () => {
        newNinjaAccount();
    });
    importAccBtn.addEventListener("click", async () => {
        importNinjaAccount();
    });

    document.querySelectorAll<HTMLDivElement>('.tab').forEach(tab => {
        tab.addEventListener('click', function (this: HTMLDivElement) {
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
            case MasterKeyStatus.NoWallet:
                browser.tabs.create({
                    url: browser.runtime.getURL("home.html#onboarding/welcome")
                }).then(() => {
                });
                return;
            case MasterKeyStatus.Locked:
            case MasterKeyStatus.Expired:
                showView('#onboarding/unlock-plugin', router);
                return;
            case MasterKeyStatus.Unlocked:
                const obj = JSON.parse(response.message);
                __walletMap = new Map<string, any>(Object.entries(obj));
                console.log("------------>>>", __walletMap.size);
                showView('#onboarding/dashboard', router);
                return;
            case MasterKeyStatus.Error:
                alert("error:" + response.message);
                return;
        }
    }).catch((error: any) => {
        console.error('Error sending message:', error);
    });
}

function populateDashboard() {
    setAccountSwitchArea();
    setupAllAccountArea()
}

function setupAllAccountArea() {
    const wallet = __walletMap.get(__systemSetting.address);
    if (!wallet) {
        return;
    }

    const nameDiv = document.getElementById("account-info-name") as HTMLElement;
    nameDiv.innerText = wallet.name ?? "Account";
    setupNinjaDetail();
    setupEtherArea();
    setupBtcArea();
    setupNostr();
}

function setAccountSwitchArea(): void {
    const parentDiv = document.getElementById("account-list-content") as HTMLElement;
    parentDiv.innerHTML = '';
    const itemTemplate = document.getElementById("account-detail-item-template") as HTMLElement;
    let selAddress = __systemSetting.address;

    __walletMap.forEach((wallet, addr) => {
        const itemDiv = itemTemplate.cloneNode(true) as HTMLElement;
        itemDiv.style.display = 'block';
        itemDiv.addEventListener("click", async () => {
            const accountListDiv = document.getElementById("account-list-area") as HTMLDivElement;
            await changeSelectedAccount(parentDiv, itemDiv, wallet);
            accountListDiv.style.display = 'none';
        })

        const nameDiv = itemDiv.querySelector(".account-detail-name") as HTMLElement;
        const addressDiv = itemDiv.querySelector(".account-detail-address") as HTMLElement;
        nameDiv.textContent = wallet.name ?? "Account";
        addressDiv.textContent = addr;

        parentDiv.appendChild(itemDiv);

        if (!selAddress) {
            selAddress = addr;
            __systemSetting.address = addr;
            __systemSetting.syncToDB().then();
        }

        if (selAddress == addr) {
            itemDiv.classList.add("active");
        }
    });
}

function notifyBackgroundActiveWallet(address: string): void {
    browser.runtime.sendMessage({action: MsgType.SetActiveAccount, address: address}).then(response => {
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

function router(path: string): void {
    if (path === '#onboarding/dashboard') {
        populateDashboard();
    }
}

function initLoginDiv(): void {
    const button = document.querySelector(".login-container .primary-button") as HTMLButtonElement;
    button.addEventListener('click', openMasterKey);
}

function openMasterKey(): void {
    const inputElement = document.querySelector(".login-container input") as HTMLInputElement;
    const password = inputElement.value;

    browser.runtime.sendMessage({action: MsgType.OpenMasterKey, password: password}).then((response: {
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

async function changeSelectedAccount(parentDiv: HTMLElement, itemDiv: HTMLElement, wallet: MultiAddress) {
    if (__systemSetting.address === wallet.address) {
        console.log("------>>> no need to change ", __systemSetting.address);
        return;
    }
    console.log("------>>> changing new ninja account=>", __systemSetting.address);

    const allItemDiv = parentDiv.querySelectorAll(".account-detail-item") as NodeListOf<HTMLElement>;
    allItemDiv.forEach(itemDiv => {
        itemDiv.classList.remove("active");
    });
    itemDiv.classList.add("active");
    await __systemSetting.changeAddr(wallet.address);
    notifyBackgroundActiveWallet(__systemSetting.address);
    setupAllAccountArea()
}

function initQrCodeShowDiv() {
    const qrDiv = document.getElementById("qr-code-image-div") as HTMLElement
    const closeBtn = qrDiv.querySelector(".qr-code-image-close") as HTMLButtonElement;
    closeBtn.addEventListener('click', () => {
        qrDiv.style.display = 'none';
    });
}