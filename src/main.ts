import {__currentDatabaseVersion, __tableSystemSetting, databaseUpdate, getMaxIdRecord, initDatabase} from "./database";
import browser from "webextension-polyfill";
import {createQRCodeImg, MsgType, showView, WalletStatus} from './common';
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
    initDessageArea();
    initEthArea();
    initBtcArea();
    initNostrArea();
    initQrCodeShowDiv();
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
        newAccount();
    });
    importAccBtn.addEventListener("click", async () => {
        importAccount();
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
            await changeSelectedAccount(parentDiv, itemDiv, wallet);
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

function setupNinjaDetail(): void {
    const wallet = __walletMap.get(__systemSetting.address);
    if (!wallet) {
        return;
    }
    const ninjaArea = document.getElementById("ninja-account-area") as HTMLElement;
    const ninjaAddrDiv = ninjaArea.querySelector(".address-val") as HTMLElement;
    ninjaAddrDiv.innerText = wallet.address;

    commonAddrAndCode("ninja-account-area", "ninja-address-qr-btn");
}

function setupEtherArea(): void {
    const wallet = __walletMap.get(__systemSetting.address);
    if (!wallet) {
        return;
    }
    const ethArea = document.getElementById("eth-account-area") as HTMLElement;
    const ethAddressVal = ethArea.querySelector(".address-val") as HTMLElement;
    ethAddressVal.textContent = wallet.ethAddr;

    commonAddrAndCode("eth-account-area", "eth-address-qr-btn");
}

function setupBtcArea(): void {

    const wallet = __walletMap.get(__systemSetting.address);
    if (!wallet) {
        return;
    }

    const btcArea = document.getElementById("btc-account-area") as HTMLElement;
    const btcAddressVal = btcArea.querySelector(".address-val") as HTMLElement;
    btcAddressVal.textContent = wallet.btcAddr;

    commonAddrAndCode("eth-account-area", "btc-address-qr-btn");
}

function setupNostr(): void {
    const wallet = __walletMap.get(__systemSetting.address);
    if (!wallet) {
        return;
    }
    const nostrArea = document.getElementById("nostr-account-area") as HTMLElement;
    const nostrAddressVal = nostrArea.querySelector(".address-val") as HTMLElement;
    nostrAddressVal.textContent = wallet.nostrAddr;

    commonAddrAndCode("eth-account-area", "nostr-address-qr-btn");
}

function commonAddrAndCode(valElmId: string, qrBtnId: string) {
    const area = document.getElementById(valElmId) as HTMLElement;
    const addrVal = area.querySelector(".address-val") as HTMLElement;
    const address = addrVal.innerText;
    area.addEventListener("click", async () => {
        navigator.clipboard.writeText(address).then(() => {
            alert("copy success");
        });
    })

    const qrBtn = document.getElementById(qrBtnId) as HTMLElement;
    qrBtn.addEventListener("click", async () => {
        const data = await createQRCodeImg(address);
        if (!data) {
            console.log("------>>> failed to create qr code");
            return;
        }
        const qrDiv = document.getElementById("qr-code-image-div") as HTMLElement
        const imgElm = qrDiv.querySelector("img");
        imgElm!.src = data;
    })
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

function newAccount() {
}

function importAccount() {
}

async function changeSelectedAccount(parentDiv: HTMLElement, itemDiv: HTMLElement, wallet: MultiAddress) {
    if (__systemSetting.address === wallet.address) {
        console.log("------>>> no need to change ", __systemSetting.address);
        return;
    }

    const allItemDiv = parentDiv.querySelectorAll(".account-detail-item") as NodeListOf<HTMLElement>;
    allItemDiv.forEach(itemDiv => {
        itemDiv.classList.remove("active");
    });
    itemDiv.classList.add("active");
    await __systemSetting.changeAddr(wallet.address);
    notifyBackgroundActiveWallet(__systemSetting.address);
    setupAllAccountArea()
}

function initDessageArea() {

}

function initEthArea() {

}

function initBtcArea() {

}

function initNostrArea() {

}

function initQrCodeShowDiv() {
    const qrDiv = document.getElementById("qr-code-image-div") as HTMLElement
    const closeBtn = qrDiv.querySelector(".qr-code-image-close") as HTMLButtonElement;
    closeBtn.addEventListener('click', () => {
        qrDiv.style.display = 'none';
    });
}