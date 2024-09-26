import {createQRCodeImg} from "./common";
import {__currentDatabaseVersion, __tableSystemSetting, databaseUpdate, getMaxIdRecord} from "./database";


class SysSetting {
    id: number;
    address: string;
    network: string;

    constructor(id: number, addr: string, network: string) {
        this.id = id;
        this.address = addr;
        this.network = network;
    }

    async syncToDB(): Promise<void> {
        await databaseUpdate(__tableSystemSetting, this.id, this);
    }

    async changeAddr(addr: string): Promise<void> {
        this.address = addr;
        await databaseUpdate(__tableSystemSetting, this.id, this);
    }
}

export let __systemSetting: SysSetting;

export async function loadLastSystemSetting(): Promise<void> {
    const ss = await getMaxIdRecord(__tableSystemSetting);
    if (ss) {
        __systemSetting = new SysSetting(ss.id, ss.address, ss.network);
        return;
    }
    __systemSetting = new SysSetting(__currentDatabaseVersion, '', '');
}

export function commonAddrAndCode(valElmId: string, qrBtnId: string) {
    const area = document.getElementById(valElmId) as HTMLElement;
    const addrVal = area.querySelector(".address-val") as HTMLElement;
    const address = addrVal.innerText;
    addrVal.addEventListener("click", async () => {
        navigator.clipboard.writeText(address).then(() => {
            alert("copy success");
        });
    })

    const qrBtn = document.getElementById(qrBtnId) as HTMLElement;
    qrBtn.addEventListener("click", async () => {
        const data = await createQRCodeImg(address);
        if (!data) {
            console.log("------>>> failed to create qr code");
            return;
        }
        const qrDiv = document.getElementById("qr-code-image-div") as HTMLElement
        const imgElm = qrDiv.querySelector("img");
        imgElm!.src = data;
    })
}