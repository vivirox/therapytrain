import { groth16 } from 'snarkjs';
import { buildPoseidon } from 'circomlibjs';
import { expect, describe, it, beforeAll } from 'bun:test';

describe('SessionValidator Circuit', () => {
    let poseidon: any;

    beforeAll(async () => {
        poseidon = await buildPoseidon();
    });

    it('validates correct session hash', async () => {
        const sessionHash = 12345n;
        const secret = 54321n;
        const hash = poseidon([sessionHash, secret]);

        const { proof, publicSignals } = await groth16.fullProve(
            { sessionHash, secret },
            'build/circuits/session_validator.wasm',
            'build/circuits/session_0001.zkey'
        );

        const verification = await groth16.verify(
            'build/verification_key.json',
            publicSignals,
            proof
        );

        expect(verification).toBe(true);
    });
});