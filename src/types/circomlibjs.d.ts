declare module 'circomlibjs' {
    export interface Signature {
        R8: Uint8Array;
        S: bigint;
    }

    export interface Eddsa {
        prv2pub: (privateKey: Buffer) => Uint8Array;
        signPoseidon: (privateKey: Buffer, msg: bigint[]) => Signature;
        signMiMC: (privateKey: Buffer, msg: Buffer) => Signature;
        verifyPoseidon: (msg: bigint[], sig: Signature, pubKey: Uint8Array) => boolean;
        packSignature: (sig: Signature) => Uint8Array;
        unpackSignature: (sig: Uint8Array) => Signature;
        pubKey2Bits: (pubKey: Uint8Array) => boolean[];
        r8Bits: (r8: Uint8Array) => boolean[];
        sBits: (s: bigint) => boolean[];
        F: any;
    }

    export function buildEddsa(): Promise<Eddsa>;
}
