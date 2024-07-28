import { keccak256 } from 'js-sha3';
import {ProtocolKey} from "./protocolKey";

export function generateEthAddress(key: ProtocolKey): string {
    if (key.mulAddr.ethAddr) {
        return key.mulAddr.ethAddr;
    }
    let ecPriKey = key.ecKey;
    const publicKey = ecPriKey.getPublic();
    const publicKeyBytes = Buffer.from(publicKey.encode('array', false).slice(1));
    const hashedPublicKey = keccak256(publicKeyBytes);
    const EthAddr = '0x' + hashedPublicKey.slice(-40);
    key.mulAddr.ethAddr = EthAddr;
    return EthAddr;
}
