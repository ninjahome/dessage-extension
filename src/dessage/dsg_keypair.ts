/*
In the **BIP44** standard, which is used for hierarchical deterministic wallets (HD wallets), the path `m/44'/60'/0'/0/0` is a commonly used derivation path for generating blockchain addresses. Here's what each part of the path means:
m / purpose' / coin_type' / account' / change / address_index

1. **`m`**: This refers to the master node (the root of the HD wallet tree), derived from the seed.

2. **`44'`**: The first number represents the purpose of the wallet and in this case, `44'` corresponds to the **BIP44** standard. The apostrophe (`'`) indicates that this is a **hardened** derivation, meaning that this level adds extra security by preventing child nodes from compromising the parent node.

3. **`60'`**: This number is the **coin type**. Each cryptocurrency has a different number assigned to it.
   - `60'` is assigned to **Ethereum**.
   - `0'` is assigned to **Bitcoin**.

4. **`0'`**: This number is the **account index**. In a BIP44-compliant wallet, you can have multiple accounts. `0'` refers to the first account. Like the previous numbers, this is a hardened derivation.

5. **`0`**: This number represents the **change**:
   - `0` refers to **external addresses** (used for receiving funds).
   - `1` refers to **internal addresses** (used for change from transactions).

6. **`0`**: This is the **address index**. It indicates the index number of the generated address. Each new address generated increments this number (e.g., `0`, `1`, `2`, etc.).

### Summary:
- **m**: Master node (root of the HD wallet).
- **44'**: Follows the BIP44 standard.
- **60'**: Coin type (60' is Ethereum, 0' is Bitcoin).
- **0'**: Account number (first account).
- **0**: External addresses for receiving.
- **0**: First address under this account.

### Example Use:
For **Ethereum**, the derivation path `m/44'/60'/0'/0/0` generates the first Ethereum address in the first account, while `m/44'/60'/0'/0/1` would generate the second address.

### More Information:
- **BIP44**: It is a specification for HD wallets allowing multiple cryptocurrencies to be managed from a single seed.
- **Hardened Derivation**: Adds an extra layer of security, especially between parent and child keys.

You can check the BIP44 standard and its specification [here](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki).
*/
import {ec as EC} from "elliptic";
import {derivePath, ExtendedKey} from "./extended_key";
import {Address, toAddress, toBtcAddress, toEthAddress, toNostrAddr} from "./address";

class DsgPrivate {
    dsgPri: string;
    ethPri: string
    btcPri: string
    nostrPri: string

    constructor(dsg: string, eth: string, btc: string, nostr: string) {
        this.dsgPri = dsg;
        this.ethPri = eth;
        this.nostrPri = nostr;
        this.btcPri = btc;
    }
}

export class DsgKeyPair {
    address: Address;
    priKey?: DsgPrivate;
    idx: number;
    name?: string;

    constructor(seedKey: ExtendedKey, idx: number) {
        const dsgKey = derivePath(seedKey, "m/44'/1286'/0'/0/" + idx);
        const btcKey = derivePath(seedKey, "m/44'/0'/0'/0/" + idx);
        const ethKey = derivePath(seedKey, "m/44'/60'/0'/0/" + idx);

        const dsg_addr = toAddress(dsgKey.publicKey);

        const btc_addr = toBtcAddress(btcKey.publicKey.toString('hex'));
        const ec = new EC('secp256k1');

        const ecKeyEth = ec.keyFromPrivate(ethKey.privateKey!);
        const eth_addr = toEthAddress(ecKeyEth);

        const ecKeyNostr = ec.keyFromPrivate(dsgKey.privateKey!);
        const result = toNostrAddr(ecKeyNostr);
        const nostr_addr = result.publicKey;

        this.address = new Address(dsg_addr, btc_addr, eth_addr, nostr_addr, idx);
        this.priKey = new DsgPrivate(dsgKey.privateKey!.toString('hex'),
            ethKey.privateKey!.toString('hex'),
            btcKey.privateKey!.toString('hex'),
            result.privateKey);
        this.name = "Address:" + idx;
        this.idx = idx;
    }
}
