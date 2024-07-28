import {ec as EC} from "elliptic";

export class ProtocolKey {
    pri: Uint8Array;
    ecKey: EC.KeyPair;
    constructor(pri: Uint8Array) {
        this.pri = pri;
        const ec = new EC('curve25519');
        this.ecKey = ec.keyFromPrivate(pri);
    }
}



