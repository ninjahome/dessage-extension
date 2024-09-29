import {commonAddrAndCode} from "./main_common";
import {DsgKeyPair} from "./dessage/dsg_keypair";

export function initBlockChainArea() {

}

export function setupBlockChainArea(keypair: DsgKeyPair): void {

    const ninjaArea = document.getElementById("blockchain-dsg-info") as HTMLElement;
    const ninjaAddrDiv = ninjaArea.querySelector(".address-val") as HTMLElement;
    ninjaAddrDiv.innerText = keypair.address.dsgAddr;
    commonAddrAndCode("blockchain-dsg-info", "ninja-address-qr-btn");

    const ethArea = document.getElementById("blockchain-eth-info") as HTMLElement;
    const ethAddressVal = ethArea.querySelector(".address-val") as HTMLElement;
    ethAddressVal.textContent = keypair.address.ethAddr;
    commonAddrAndCode("blockchain-eth-info", "eth-address-qr-btn");

    const btcArea = document.getElementById("blockchain-btc-info") as HTMLElement;
    const btcAddressVal = btcArea.querySelector(".address-val") as HTMLElement;
    btcAddressVal.textContent = keypair.address.btcAddr;
    commonAddrAndCode("blockchain-btc-info", "btc-address-qr-btn");
}
