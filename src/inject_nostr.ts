import {__injectRequests} from "./inject";

export function injectNostr() {
    window.nostr = {
        _pubkey: null,
        version:'1.0.2',
        async getPublicKey() {
            if (this._pubkey) return this._pubkey;
            this._pubkey = await __injectCall('getPublicKey', {});
            return this._pubkey;
        },

        async signEvent(event: any) {
            return __injectCall('signEvent', { event });
        },

        async getRelays() {
            return __injectCall('getRelays', {});
        },

        nip04: {
            async encrypt(peer: string, plaintext: string) {
                return __injectCall('nip04.encrypt', { peer, plaintext });
            },

            async decrypt(peer: string, ciphertext: string) {
                return __injectCall('nip04.decrypt', { peer, ciphertext });
            }
        },

        nip44: {
            async encrypt(peer: string, plaintext: string) {
                return __injectCall('nip44.encrypt', { peer, plaintext });
            },

            async decrypt(peer: string, ciphertext: string) {
                return __injectCall('nip44.decrypt', { peer, ciphertext });
            }
        }
    };
}

// 通用的 __injectCall 函数
function __injectCall(type: string, params: any): Promise<any> {
    const id = Math.random().toString().slice(-4);
    return new Promise((resolve, reject) => {
        __injectRequests[id] = { resolve, reject };
        window.postMessage(
            {
                id,
                ext: 'nos2x',
                type,
                params
            },
            '*'
        );

        // Optionally handle timeout
        setTimeout(() => {
            if (__injectRequests[id]) {
                reject(new Error('Request timed out'));
                delete __injectRequests[id];
            }
        }, 10000); // 10秒超时
    });
}

