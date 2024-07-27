export class ProtocolKey {
    pri: Uint8Array;
    NinjaAddr: string;
    BtcAddr:string;
    EthAddr:string;
    NostrAddr:string;
    BtcTestAddr:string;
    constructor(pri: Uint8Array) {
        this.pri = pri;
        this.NinjaAddr = "";
        this.BtcAddr = "";
        this.EthAddr = "";
        this.NostrAddr = "";
        this.BtcTestAddr = "";
    }
}