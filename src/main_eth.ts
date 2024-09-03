import {__systemSetting, commonAddrAndCode} from "./main_common";
import {__walletMap} from "./main";

export function initEthArea() {

}

export function setupEtherArea(): void {
    const wallet = __walletMap.get(__systemSetting.address);
    if (!wallet) {
        return;
    }
    const ethArea = document.getElementById("eth-account-area") as HTMLElement;
    const ethAddressVal = ethArea.querySelector(".address-val") as HTMLElement;
    ethAddressVal.textContent = wallet.ethAddr;

    commonAddrAndCode("eth-account-area", "eth-address-qr-btn");
}
