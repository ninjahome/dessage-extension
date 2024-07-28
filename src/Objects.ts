import nacl from "tweetnacl";
import {ec as EC} from "elliptic";

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

export class ProtocolKey {
    pri: Uint8Array;
    NostrPri?: string | null;
    ninjaKey?: nacl.BoxKeyPair | null;
    ecKey?: EC.KeyPair | null;
    outerWallet?:OuterWallet | null;

    constructor(pri: Uint8Array) {
        this.pri = pri;
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

export class Wallet {
    uuid: string;
    address: string;
    cipherTxt: CipherData;
    mnemonic: string;

    constructor(uuid: string, addr: string, cipherTxt: CipherData, mnemonic: string) {
        this.uuid = uuid;
        this.address = addr;
        this.cipherTxt = cipherTxt;
        this.mnemonic = mnemonic;
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
