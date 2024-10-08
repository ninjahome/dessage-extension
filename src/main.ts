import {initDatabase} from "./database";
import browser from "webextension-polyfill";
import {
    MsgType,
    showView,
    MasterKeyStatus,
    loadSystemSetting,
    getKeyStatus, sessionGet, updateSetting
} from './common';
import {initWeb2Area, setupWeb2Area} from "./main_web2";
import {initWeb3Area, setupWeb3Area} from "./main_web3";
import {initBlockChainArea, setupBlockChainArea} from "./main_blockchain";
import {initSettingArea, setupSettingArea} from "./main_setting";
import {__key_sub_account_address_list, wrapKeyPairKey} from "./background";
import {Address} from "./dessage/address";

document.addEventListener("DOMContentLoaded", initDessagePlugin as EventListener);

async function initDessagePlugin(): Promise<void> {
    await initDatabase();
    await checkBackgroundStatus();
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
        await newNinjaAccount();
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

async function checkBackgroundStatus(): Promise<void> {
    const status = await getKeyStatus();

    switch (status) {
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
            showView('#onboarding/dashboard', router);
            return;

        default:
            alert("error:invalid status of key:" + status);
            return;
    }
}

async function populateDashboard() {
    await setAccountSwitchArea();
    await setupContentArea();
}

async function setAccountSwitchArea(): Promise<void> {
    const parentDiv = document.getElementById("account-list-content") as HTMLElement;
    parentDiv.innerHTML = '';

    const itemTemplate = document.getElementById("account-detail-item-template") as HTMLElement;
    const ss = await loadSystemSetting();
    let selAddress = ss.address;
    const accStr = await sessionGet(__key_sub_account_address_list);
    const accountAddressList = JSON.parse(accStr) as Address[];

    console.log("--------------->>>>>>account size:=>", accountAddressList.length);

    for (const address of accountAddressList) {
        const idx = accountAddressList.indexOf(address);
        const itemDiv = itemTemplate.cloneNode(true) as HTMLElement;
        itemDiv.style.display = 'block';
        itemDiv.addEventListener("click", async () => {
            const accountListDiv = document.getElementById("account-list-area") as HTMLDivElement;
            await changeSelectedAccount(parentDiv, itemDiv, address);
            accountListDiv.style.display = 'none';
        });

        const nameDiv = itemDiv.querySelector(".account-detail-name") as HTMLElement;
        const addressDiv = itemDiv.querySelector(".account-detail-address") as HTMLElement;
        nameDiv.textContent = "Account " + idx;
        addressDiv.textContent = address.dsgAddr;

        parentDiv.appendChild(itemDiv);

        if (!selAddress) {
            selAddress = address.dsgAddr;
            ss.address = address.dsgAddr;
            await updateSetting(ss);
        }

        if (selAddress == address.dsgAddr) {
            itemDiv.classList.add("active");
        }
    }
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
        populateDashboard().then();
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

        showView('#onboarding/dashboard', router);
        inputElement.value = '';
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

async function changeSelectedAccount(parentDiv: HTMLElement, itemDiv: HTMLElement, address: Address) {
    const ss = await loadSystemSetting();
    if (ss.address === address.dsgAddr) {
        console.log("------>>> no need to change ", ss.address);
        return;
    }
    console.log("------>>> changing new ninja account=>", ss.address);

    const allItemDiv = parentDiv.querySelectorAll(".account-detail-item") as NodeListOf<HTMLElement>;
    allItemDiv.forEach(itemDiv => {
        itemDiv.classList.remove("active");
    });
    itemDiv.classList.add("active");
    ss.address = address.dsgAddr;
    await updateSetting(ss);
    notifyBackgroundActiveWallet(ss.address);
    setupContentArea().then();
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

async function setupContentArea() {
    const ss = await loadSystemSetting();
    if (!ss.address) {
        console.log("no selected account found for content area");
        return;
    }

    const accStr = await sessionGet(wrapKeyPairKey(ss.address));
    const keypair = JSON.parse(accStr);
    if (!keypair) {
        console.log("=======>>> must have a selected address:=?", ss)
        return;
    }

    const nameDiv = document.getElementById("account-info-name") as HTMLElement;
    nameDiv.innerText = keypair.name ?? "Account";

    setupWeb2Area(keypair.address);
    setupBlockChainArea(keypair.address);
    setupWeb3Area(keypair.address);
    setupSettingArea();
}

async function newNinjaAccount() {
    const response = await browser.runtime.sendMessage({action: MsgType.NewSubAccount});
    if (response.status <= 0) {
        alert(response.message);
        return;
    }
}
