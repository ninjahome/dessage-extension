import {commonAddrAndCode} from "./main_common";
import {DsgKeyPair} from "./dessage/dsg_keypair";

export function initWeb3Area() {
}

export function setupWeb3Area(keypair:DsgKeyPair): void {
    const nostrArea = document.getElementById("web3-account-area") as HTMLElement;
    const nostrAddressVal = nostrArea.querySelector(".address-val") as HTMLElement;
    nostrAddressVal.textContent = keypair.address.nostrAddr;
    commonAddrAndCode("web3-account-area", "nostr-address-qr-btn");
}
