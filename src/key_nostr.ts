import {ProtocolKey} from "./protocolKey";
import {ec as EC} from "elliptic";
import {convertBits, hexStringToByteArray} from "./util";
import {bech32} from "bech32";

export function castNostrPriKey(key: ProtocolKey): { publicKey: string, privateKey: string } {
    if (key.NostrPri && key.mulAddr.nostrAddr) {
        return {publicKey: key.mulAddr.nostrAddr, privateKey: key.NostrPri};
    }
    const ecKey = key.ecKey;
    const nostrEncodedKey = encodeKeysWithBech32(ecKey);
    key.NostrPri = nostrEncodedKey.privateKey;
    key.mulAddr.nostrAddr = nostrEncodedKey.publicKey;
    return {publicKey: key.mulAddr.nostrAddr, privateKey: key.NostrPri};
}

function encodeKeysWithBech32(ecKey: EC.KeyPair): { publicKey: string, privateKey: string } {
    const publicKeyHex = ecKey.getPublic(true, 'hex');
    const privateKeyHex = ecKey.getPrivate('hex');

    const publicKeyBytes = hexStringToByteArray(publicKeyHex).slice(1);
    const privateKeyBytes = hexStringToByteArray(privateKeyHex);

    const publicWords = convertBits(publicKeyBytes, 8, 5);
    const privateWords = convertBits(privateKeyBytes, 8, 5);

    const encodedPublicKey = bech32.encode('npub', publicWords);
    const encodedPrivateKey = bech32.encode('nsec', privateWords);

    return {
        publicKey: encodedPublicKey,
        privateKey: encodedPrivateKey
    };
}