import {__systemSetting, commonAddrAndCode} from "./main_common";
import {__keypairMap} from "./main";

export function initNostrArea() {

}


export function setupNostr(): void {
    const keypair = __keypairMap.get(__systemSetting.address);
    if (!keypair) {
        return;
    }
    const nostrArea = document.getElementById("nostr-account-area") as HTMLElement;
    const nostrAddressVal = nostrArea.querySelector(".address-val") as HTMLElement;
    nostrAddressVal.textContent = keypair.address.nostrAddr;

    commonAddrAndCode("nostr-account-area", "nostr-address-qr-btn");
}

