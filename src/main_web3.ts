import {Address} from "./dessage/address";
import {commonAddrAndCode} from "./common";

export function initWeb3Area() {
}

export function setupWeb3Area(address:Address): void {
    const nostrArea = document.getElementById("web3-account-area") as HTMLElement;
    const nostrAddressVal = nostrArea.querySelector(".address-val") as HTMLElement;
    nostrAddressVal.textContent = address.nostrAddr;
    commonAddrAndCode("web3-account-area", "nostr-address-qr-btn");
}
