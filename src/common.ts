import * as QRCode from 'qrcode';
import browser from "webextension-polyfill";

const storage = browser.storage;
const INFURA_PROJECT_ID: string = 'eced40c03c2a447887b73369aee4fbbe';

export enum MasterKeyStatus {
    Init = 'Init',
    NoWallet = 'NoWallet',
    Locked = 'Locked',
    Unlocked = 'Unlocked',
    Expired = 'Expired',
}

export enum MsgType {
    QueryBindings = 'QueryBindings',
    PopupMainPage = 'PopupMainPage',
}

export function showView(hash: string, callback: (hash: string) => void): void {
    const views = document.querySelectorAll<HTMLElement>('.view');
    views.forEach(view => view.style.display = 'none');

    const id = hash.replace('#onboarding/', 'view-');
    const targetView = document.getElementById(id);
    if (targetView) {
        targetView.style.display = 'block';
    }
    callback(hash);
}

export async function createQRCodeImg(data: string) {
    try {
        const url = await QRCode.toDataURL(data, {errorCorrectionLevel: 'H'});
        console.log('Generated QR Code:', url);
        return url;
    } catch (error) {
        console.error('Error generating QR Code:', error);
        return null
    }
}

export async function sessionSet(key: string, value: any): Promise<void> {
    try {
        await storage.session.set({[key]: value});
    } catch (error: unknown) {
        const err = error as Error;
        console.error("[service work] Failed to set value:", err);
    }
}

export async function sessionGet(key: string): Promise<any> {
    try {
        const result = await storage.session.get(key);
        return result[key];
    } catch (error: unknown) {
        const err = error as Error;
        console.error("[service work] Failed to get value:", err);
        return null;
    }
}

export async function sessionRemove(key: string): Promise<void> {
    try {
        await storage.session.remove(key);
        // console.log("[service work] Value was removed successfully.");
    } catch (error) {
        console.error("[service work] Failed to remove value:", error);
    }
}

function observeAction(target: HTMLElement, idleThreshold: number,
                       foundFunc: () => HTMLElement | null, callback: () => Promise<void>,
                       options: MutationObserverInit, continueMonitor?: boolean) {
    const cb: MutationCallback = (mutationsList, observer) => {
        const element = foundFunc();
        if (!element) {
            return;
        }
        if (!continueMonitor) {
            observer.disconnect();
        }
        let idleTimer = setTimeout(() => {
            callback().then();
            clearTimeout(idleTimer);
            console.log('---------->>> observer action finished:=> continue=>', continueMonitor);
        }, idleThreshold);
    };

    const observer = new MutationObserver(cb);
    observer.observe(target, options);
}

export function observeForElement(target: HTMLElement, idleThreshold: number,
                                  foundFunc: () => HTMLElement | null, callback: () => Promise<void>,
                                  continueMonitor?: boolean) {

    observeAction(target, idleThreshold, foundFunc, callback, {childList: true, subtree: true}, continueMonitor);
}

export function observeForElementDirect(target: HTMLElement, idleThreshold: number,
                                        foundFunc: () => HTMLElement | null, callback: () => Promise<void>,
                                        continueMonitor?: boolean) {
    observeAction(target, idleThreshold, foundFunc, callback, {childList: true, subtree: false}, continueMonitor);
}


export function queryEthBalance(ethAddr: string) {
    console.log(`start to query eth[${ethAddr}] balance for:`);
    fetch(`https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [ethAddr, 'latest'],
            id: 1
        })
    }).then(response => response.json())
        .then(result => {
            if (result.error) {
                console.error('[service work] Error:', result.error.message);
            } else {
                const balanceInWei = result.result;
                const balanceInEth = parseInt(balanceInWei, 16) / (10 ** 18);
                console.log(`[service work] Address: ${ethAddr}`, `Balance: ${balanceInEth} ETH`);
            }
        })
        .catch(error => {
            console.error('[service work] Ping failed:', error);
        });
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

