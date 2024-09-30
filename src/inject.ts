interface InjectRequest {
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
}

interface EventData {
    id?: string;
    result?: any;
    error?: any;
    source?: string;
}

interface Window {
    dessage?: {
        version: string;
        connect: () => void;
    };
    nostr?: Nostr;
}

interface Nostr {
    version: string;
    _pubkey: string | null;
    getPublicKey: () => Promise<string | null>;
    signEvent: (event: any) => Promise<any>;
    getRelays: () => Promise<any>;
    nip04: NIP04;
    nip44: NIP44;
}


interface NIP04 {
    encrypt: (peer: string, plaintext: string) => Promise<any>;
    decrypt: (peer: string, ciphertext: string) => Promise<any>;
}

interface NIP44 {
    encrypt: (peer: string, plaintext: string) => Promise<any>;
    decrypt: (peer: string, ciphertext: string) => Promise<any>;
}

(function () {
    const __injectRequests: { [key: string]: InjectRequest } = {};

    window.addEventListener("message", (event: MessageEvent) => {
        if (event.source !== window || !event.data || (event.data as EventData).source !== "dessage-response") {
            return;
        }

        const { id, result, error } = event.data as EventData;
        if (id && __injectRequests[id]) {
            const { resolve, reject } = __injectRequests[id];
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
            delete __injectRequests[id];
        }

        console.log("Response from background:", result);
    });

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

    // 设置 dessage 对象
    window.dessage = {
        version: '1.0.5',
        connect: function () {
            console.log('Connecting to Dessage...');
            window.postMessage({ source: "dessage", action: "someAction", data: "some data" }, "*");
        },
    };

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
    const hostname = window.location.hostname;
    console.log('----------------->>>>>>>hostname', hostname);
    if (hostname.includes("x.com")) {
        initTwitterInfo();
    }
    console.log(`------>>>>Dessage inject success domain:[${window.location.host}]
     dessage obj:[${window.dessage}] nostr obj:[${window.nostr}]
    dessage version: ${window.dessage.version} nostr version:${window.nostr.version}
     `);
})();

