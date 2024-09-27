import {__systemSetting, commonAddrAndCode} from "./main_common";
import {__keypairMap} from "./main";

export function initBtcArea() {

}


export function setupBtcArea(): void {

    const keypair = __keypairMap.get(__systemSetting.address);
    if (!keypair) {
        return;
    }

    const btcArea = document.getElementById("btc-account-area") as HTMLElement;
    const btcAddressVal = btcArea.querySelector(".address-val") as HTMLElement;
    btcAddressVal.textContent = keypair.address.btcAddr;

    commonAddrAndCode("btc-account-area", "btc-address-qr-btn");
}
