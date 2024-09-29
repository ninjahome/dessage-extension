import {initDatabase} from "./database";
import browser from "webextension-polyfill";
import {MsgType, showView, MasterKeyStatus} from './common';
import {__systemSetting, loadLastSystemSetting} from "./main_common";
import {initWeb2Area, newNinjaAccount, setupWeb2Area} from "./main_web2";
import {initWeb3Area, setupWeb3Area} from "./main_web3";
import {initBlockChainArea, setupBlockChainArea} from "./main_blockchain";
import {initSettingArea, setupSettingArea} from "./main_setting";
import {DsgKeyPair} from "./dessage/dsg_keypair";

document.addEventListener("DOMContentLoaded", initDessagePlugin as EventListener);
export let __keypairMap: Map<string, DsgKeyPair> = new Map();

async function initDessagePlugin(): Promise<void> {
    await initDatabase();
    await loadLastSystemSetting();
    checkBackgroundStatus();
    initLoginDiv();
    initDashBoard();
    initWeb2Area();
    initWeb3Area();
    initBlockChainArea();
    initSettingArea();
    initQrCodeShowDiv();
}

function initDashBoard(): void {

    const accountListDiv = document.getElementById("account-list-area") as HTMLDivElement;

    const accountListDropDownBtn = document.getElementById("account-list-drop-down-btn") as HTMLButtonElement;
    accountListDropDownBtn.addEventListener("click", async () => {
        accountListDiv.style.display = "block";
    });

    const quitBtn = document.getElementById("exit_dashboard_btn") as HTMLButtonElement;
    quitBtn.addEventListener("click", async () => {
        await quitFromDashboard();
    })

    const listCloseBtn = accountListDiv.querySelector(".account-list-header-btn") as HTMLButtonElement;
    listCloseBtn.addEventListener("click", async () => {
        accountListDiv.style.display = "none";
    })

    const newAccBtn = accountListDiv.querySelector(".account-list-new-account") as HTMLButtonElement;
    newAccBtn.addEventListener("click", async () => {
        newNinjaAccount();
    });

    document.querySelectorAll<HTMLDivElement>('.tab').forEach(tab => {
        if (tab.dataset.listenerAdded) {
            return;
        }
        tab.addEventListener('click', function (this: HTMLDivElement) {
            document.querySelectorAll<HTMLDivElement>('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll<HTMLDivElement>('.wallet-content-area > div').forEach(content => content.classList.remove('active'));

            this.classList.add('active');
            const targetId = this.dataset.target;
            if (targetId) {
                document.getElementById(targetId)?.classList.add('active');
            }
        });
        tab.dataset.listenerAdded = 'true';
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
                __keypairMap = new Map<string, DsgKeyPair>(Object.entries(obj));
                console.log("------------>>>keypair size=", __keypairMap.size);
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
    setupContentArea()

}


function setAccountSwitchArea(): void {
    const parentDiv = document.getElementById("account-list-content") as HTMLElement;
    parentDiv.innerHTML = '';
    const itemTemplate = document.getElementById("account-detail-item-template") as HTMLElement;
    let selAddress = __systemSetting.address;
    console.log("--------------->>>>>>account size:=>", __keypairMap.size);
    __keypairMap.forEach((keypair, addr) => {
        const itemDiv = itemTemplate.cloneNode(true) as HTMLElement;
        itemDiv.style.display = 'block';
        itemDiv.addEventListener("click", async () => {
            const accountListDiv = document.getElementById("account-list-area") as HTMLDivElement;
            await changeSelectedAccount(parentDiv, itemDiv, keypair);
            accountListDiv.style.display = 'none';
        })

        const nameDiv = itemDiv.querySelector(".account-detail-name") as HTMLElement;
        const addressDiv = itemDiv.querySelector(".account-detail-address") as HTMLElement;
        nameDiv.textContent = keypair.name ?? "Account";
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

async function openMasterKey(): Promise<void> {
    const inputElement = document.querySelector(".login-container input") as HTMLInputElement;
    const password = inputElement.value;

    try {
        const response = await browser.runtime.sendMessage({
            action: MsgType.OpenMasterKey,
            password: password
        });

        if (!response.status) {
            const errTips = document.querySelector(".login-container .login-error") as HTMLElement;
            errTips.innerText = response.message;
            return;
        }

        const obj = JSON.parse(response.message);
        __keypairMap = new Map<string, DsgKeyPair>(Object.entries(obj));
        console.log("------------>>>keypair size=", __keypairMap.size);
        showView('#onboarding/dashboard', router);
        inputElement.value = '';
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

async function changeSelectedAccount(parentDiv: HTMLElement, itemDiv: HTMLElement, keyPair: DsgKeyPair) {
    if (__systemSetting.address === keyPair.address.dsgAddr) {
        console.log("------>>> no need to change ", __systemSetting.address);
        return;
    }
    console.log("------>>> changing new ninja account=>", __systemSetting.address);

    const allItemDiv = parentDiv.querySelectorAll(".account-detail-item") as NodeListOf<HTMLElement>;
    allItemDiv.forEach(itemDiv => {
        itemDiv.classList.remove("active");
    });
    itemDiv.classList.add("active");
    await __systemSetting.changeAddr(keyPair.address.dsgAddr);
    notifyBackgroundActiveWallet(__systemSetting.address);
    setupContentArea()
}

function initQrCodeShowDiv() {
    const qrDiv = document.getElementById("qr-code-image-div") as HTMLElement
    const closeBtn = qrDiv.querySelector(".qr-code-image-close") as HTMLButtonElement;
    closeBtn.addEventListener('click', () => {
        qrDiv.style.display = 'none';
    });
}

async function quitFromDashboard() {
    showView('#onboarding/unlock-plugin', router);
    await browser.runtime.sendMessage({action: MsgType.CloseMasterKey});
}

function setupContentArea(){
    const keypair = __keypairMap.get(__systemSetting.address);
    if (!keypair) {
        console.log("=======>>> must have a selected address:=?", __keypairMap, __systemSetting)
        return;
    }
    const nameDiv = document.getElementById("account-info-name") as HTMLElement;
    nameDiv.innerText = keypair.name ?? "Account";

    setupWeb2Area(keypair);
    setupBlockChainArea(keypair);
    setupWeb3Area(keypair);
    setupSettingArea(keypair);
}