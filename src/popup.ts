import browser from "webextension-polyfill";
// 假设 generateMnemonic 导出在 wallet.js 中
import {
    generateBase58,
    generateKey,
    generateMnemonic,
    generateNaclKey,
    encryptAes,
    decryptAes,
    encodeBech32,
    decodeBech32,
    generateEthereumHash,
    createEthereumTransaction
} from './wallet';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Hello World Extension loaded.');

    const generateButton = document.getElementById('generate-button');
    if (generateButton) {
        generateButton.onclick = async () => {
            try {
                const {mnemonic, seed} = await generateMnemonic();
                console.log('Generated mnemonic:', mnemonic);
                console.log('Seed:', seed);

                const {publicKey, privateKey} = generateKey();
                console.log('publicKey:', publicKey);
                console.log('privateKey:', privateKey);

                const input = 'Hello, world!';
                let result = generateBase58(input);
                console.log('Encoded:', result.encoded);
                console.log('Decoded:', result.decoded);

                const inputMessage = 'A good start from tomorrow!';
                let result2 = generateNaclKey(inputMessage);
                console.log('Public Key:', result2.publicKey);
                console.log('Secret Key:', result2.secretKey);
                console.log('Nonce:', result2.nonce);
                console.log('Encoded Message:', result2.encryptedMessage);
                console.log('Decoded Message:', result2.decodedMessage);


                // 使用示例
                const password = 'mySecretPassword';
                const message = 'Hello, world!';

                const encryptedData = encryptAes(message, password);
                console.log('Encrypted Data:', encryptedData);

                const decryptedMessage = decryptAes(encryptedData, password);
                console.log('Decrypted Message:', decryptedMessage);

                // 使用示例
                const encoded = encodeBech32(input);
                console.log('Encoded:', encoded);
                const {prefix, decoded} = decodeBech32(encoded);
                console.log('Prefix:', prefix);
                console.log('Decoded:', decoded);

                // 使用示例
                const input2 = 'Hello, Ethereum!';
                const hashHex = generateEthereumHash(input2);
                console.log('Hash2:', hashHex);

                // 使用示例
                const privateKeyHex = privateKey;
                const to = '0x668299bEcCd7A500687315B4a49124Df4DDa9C0e';//publicKey;
                const value = '1000000000000000000'; // 1 ETH in wei
                const gasLimit = 21000;
                const gasPrice = 20000000000; // 20 Gwei

                const signedTxHex = createEthereumTransaction(privateKeyHex, to, value, gasLimit, gasPrice);
                console.log('Signed Transaction:', signedTxHex);

            } catch (error) {
                console.error('Error generating mnemonic:', error);
            }
        };
    }
});
