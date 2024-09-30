// global.d.ts
export {};

declare global {
    interface Window {
        dessage?: Dessage;
        nostr?: Nostr;
    }
}

interface Dessage {
    version: string;
    connect: () => void;
}

interface NIP04 {
    encrypt: (peer: string, plaintext: string) => Promise<any>;
    decrypt: (peer: string, ciphertext: string) => Promise<any>;
}

interface NIP44 {
    encrypt: (peer: string, plaintext: string) => Promise<any>;
    decrypt: (peer: string, ciphertext: string) => Promise<any>;
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
