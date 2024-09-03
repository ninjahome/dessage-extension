import {__systemSetting, commonAddrAndCode} from "./main_common";
import {__walletMap} from "./main";

export function initNostrArea() {

}


export function setupNostr(): void {
    const wallet = __walletMap.get(__systemSetting.address);
    if (!wallet) {
        return;
    }
    const nostrArea = document.getElementById("nostr-account-area") as HTMLElement;
    const nostrAddressVal = nostrArea.querySelector(".address-val") as HTMLElement;
    nostrAddressVal.textContent = wallet.nostrAddr;

    commonAddrAndCode("nostr-account-area", "nostr-address-qr-btn");
}

