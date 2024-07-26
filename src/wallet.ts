export type Wallet = {
    address: string;
    key: {
        BtcAddr: string;
        EthAddr: string;
        NostrAddr: string;
        BtcTestAddr: string;
    };
    decryptKey: (pwd: string) => void;
};

export class OuterWallet {
    address: string;
    btcAddr: string;
    ethAddr: string;
    nostrAddr: string;
    testBtcAddr: string;

    constructor(address: string, btcAddr: string, ethAddr: string, nostrAddr: string, testBtcAddr: string) {
        this.address = address;
        this.btcAddr = btcAddr;
        this.ethAddr = ethAddr;
        this.nostrAddr = nostrAddr;
        this.testBtcAddr = testBtcAddr;
    }
}

export class DbWallet {
    uuid: string;
    address: string;
    cipherTxt: string;
    mnemonic: string;

    constructor(uuid: string, address: string, cipherTxt: string, mnemonic: string) {
        this.uuid = uuid;
        this.address = address;
        this.cipherTxt = cipherTxt;
        this.mnemonic = mnemonic;
    }
}


export function loadLocalWallet(){
    return [];
}