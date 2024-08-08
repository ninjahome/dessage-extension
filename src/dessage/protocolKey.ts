import {ec as EC} from "elliptic";
import nacl from "tweetnacl";

export class ProtocolKey {
    pri: Uint8Array;
    ecKey: EC.KeyPair;
    dessageKey:nacl.BoxKeyPair;
    constructor(pri: Uint8Array) {
        this.pri = pri;
        this.dessageKey = nacl.box.keyPair.fromSecretKey(pri);
        const ec = new EC('secp256k1');
        this.ecKey = ec.keyFromPrivate(pri);
    }
}
