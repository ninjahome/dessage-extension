export class MultiAddress {
    address: string;
    btcAddr?: string|null;
    ethAddr?: string|null;
    nostrAddr?: string|null;
    testBtcAddr?: string|null;

    constructor(address: string, btcAddr?: string, ethAddr?: string, nostrAddr?: string, testBtcAddr?: string) {
        this.address = address;
        this.btcAddr = btcAddr;
        this.ethAddr = ethAddr;
        this.nostrAddr = nostrAddr;
        this.testBtcAddr = testBtcAddr;
    }
}

export class CipherData {
    cipherTxt: string;
    iv: string;
    salt: string;

    constructor(cipherTxt: string, iv: string, salt: string) {
        this.cipherTxt = cipherTxt;
        this.iv = iv;
        this.salt = salt;
    }
}

export class DbWallet {
    uuid: string;
    address: string;
    cipherTxt: CipherData;
    mnemonic: string;

    constructor(uuid: string, address: string, cipherTxt: CipherData, mnemonic: string) {
        this.uuid = uuid;
        this.address = address;
        this.cipherTxt = cipherTxt;
        this.mnemonic = mnemonic;
    }
}
