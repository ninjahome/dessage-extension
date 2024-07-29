import {ec as EC} from "elliptic";

export class ProtocolKey {
    pri: Uint8Array;
    ecKey: EC.KeyPair;
    constructor(pri: Uint8Array) {
        this.pri = pri;
        const ec = new EC('secp256k1');//
        this.ecKey = ec.keyFromPrivate(pri);
        console.log(`++++++++>>> ec  pri: ${pri} private key:${this.ecKey.getPrivate('hex')}`);
    }
}



