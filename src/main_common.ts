import {createQRCodeImg} from "./common";
import {__currentDatabaseVersion, __tableSystemSetting, databaseUpdate, getMaxIdRecord} from "./database";


export class SysSetting {
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


export async function loadSystemSettingFromDB(): Promise<SysSetting> {
    const ss = await getMaxIdRecord(__tableSystemSetting);
    if (ss) {
        return new SysSetting(ss.id, ss.address, ss.network);
    }
    return  new SysSetting(__currentDatabaseVersion, '', '');
}

export function commonAddrAndCode(valElmId: string, qrBtnId: string) {
    const area = document.getElementById(valElmId) as HTMLElement;
    const addrVal = area.querySelector(".address-val") as HTMLElement;
    const address = addrVal.innerText;

    // 检查是否已经有监听器存在，如果没有才添加
    if (!addrVal.dataset.listenerAdded) {
        addrVal.addEventListener("click", async () => {
            navigator.clipboard.writeText(address).then(() => {
                alert("copy success");
            });
        });
        // 设置标记，表示已添加监听器
        addrVal.dataset.listenerAdded = "true";
    }

    const qrBtn = document.getElementById(qrBtnId) as HTMLElement;

    if (!qrBtn.dataset.listenerAdded) {
        qrBtn.addEventListener("click", async () => {
            const data = await createQRCodeImg(address);
            if (!data) {
                console.log("------>>> failed to create qr code");
                return;
            }
            const qrDiv = document.getElementById("qr-code-image-div") as HTMLElement;
            const imgElm = qrDiv.querySelector("img");
            imgElm!.src = data;
            qrDiv.style.display = "block";
        });
        // 设置标记
        qrBtn.dataset.listenerAdded = "true";
    }
}
