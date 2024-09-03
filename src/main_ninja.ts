import {__systemSetting, commonAddrAndCode} from "./main_common";
import {__walletMap} from "./main";

export function initDessageArea() {

}

export function setupNinjaDetail(): void {
    const wallet = __walletMap.get(__systemSetting.address);
    if (!wallet) {
        return;
    }
    const ninjaArea = document.getElementById("ninja-account-area") as HTMLElement;
    const ninjaAddrDiv = ninjaArea.querySelector(".address-val") as HTMLElement;
    ninjaAddrDiv.innerText = wallet.address;

    commonAddrAndCode("ninja-account-area", "ninja-address-qr-btn");
}
