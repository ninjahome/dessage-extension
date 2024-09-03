import {__systemSetting, commonAddrAndCode} from "./main_common";
import {__walletMap} from "./main";

export function initBtcArea() {

}


export function setupBtcArea(): void {

    const wallet = __walletMap.get(__systemSetting.address);
    if (!wallet) {
        return;
    }

    const btcArea = document.getElementById("btc-account-area") as HTMLElement;
    const btcAddressVal = btcArea.querySelector(".address-val") as HTMLElement;
    btcAddressVal.textContent = wallet.btcAddr;

    commonAddrAndCode("btc-account-area", "btc-address-qr-btn");
}
