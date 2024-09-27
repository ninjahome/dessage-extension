import {__systemSetting, commonAddrAndCode} from "./main_common";
import {__keypairMap} from "./main";

export function initEthArea() {

}

export function setupEtherArea(): void {
    const keypair = __keypairMap.get(__systemSetting.address);
    if (!keypair) {
        return;
    }
    const ethArea = document.getElementById("eth-account-area") as HTMLElement;
    const ethAddressVal = ethArea.querySelector(".address-val") as HTMLElement;
    ethAddressVal.textContent = keypair.address.ethAddr;

    commonAddrAndCode("eth-account-area", "eth-address-qr-btn");
}
