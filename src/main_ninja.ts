import {__systemSetting, commonAddrAndCode} from "./main_common";
import {__keypairMap} from "./main";
import browser from "webextension-polyfill";

export function initDessageArea() {

}

export function setupNinjaDetail(): void {
    const keypair = __keypairMap.get(__systemSetting.address);
    if (!keypair) {
        return;
    }
    const ninjaArea = document.getElementById("ninja-account-area") as HTMLElement;
    const ninjaAddrDiv = ninjaArea.querySelector(".address-val") as HTMLElement;
    ninjaAddrDiv.innerText = keypair.address.dsgAddr;

    commonAddrAndCode("ninja-account-area", "ninja-address-qr-btn");
}

export function newNinjaAccount() {
    browser.tabs.create({
        url: browser.runtime.getURL("home.html#onboarding/welcome")
    }).then(() => {
    });
}


export function importNinjaAccount() {
    browser.tabs.create({
        url: browser.runtime.getURL("home.html#onboarding/import-wallet")
    }).then(() => {
    });
}