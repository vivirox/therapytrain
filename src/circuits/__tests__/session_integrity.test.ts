import { wasm as wasmTester } from 'circom_tester';
import * as path from 'path';
import { buildEddsa } from 'circomlibjs';
import { randomBytes } from 'crypto';

describe('Session Integrity Circuit', () => {
    let circuit: any;
    let eddsa: any;

    beforeAll(async () => {
        circuit = await wasmTester(path.join(__dirname, '../session_integrity.circom'));
        eddsa = await buildEddsa();
    });

    it('should verify valid session data', async () => {
        // Generate valid EdDSA keypair
        const privateKey = randomBytes(32);
        const publicKey = eddsa.prv2pub(privateKey);

        // Create signature for session ID
        const sessionId = '123456789';
        const msgBuf = Buffer.from(sessionId);
        const signature = eddsa.signMiMC(privateKey, msgBuf);

        // Convert public key and signature to bit arrays
        const pubKeyBits = eddsa.pubKey2Bits(publicKey);
        const sigR8Bits = eddsa.r8Bits(signature.R8);
        const sigSBits = eddsa.sBits(signature.S);

        const input = {
            sessionId,
            timestamp: Math.floor(Date.now() / 1000),
            therapistPubKey: pubKeyBits,
            metricsHash: '0x5678',
            durationMinutes: 60,
            interventionCount: 5,
            riskLevel: 3,
            engagementScore: 85,
            clientDataHash: '0x9abc',
            therapistSigR8: sigR8Bits,
            therapistSigS: sigSBits
        };

        const witness = await circuit.calculateWitness(input);
        await circuit.checkConstraints(witness);
    });

    it('should reject invalid duration', async () => {
        // Generate valid EdDSA keypair
        const privateKey = randomBytes(32);
        const publicKey = eddsa.prv2pub(privateKey);

        // Create signature for session ID
        const sessionId = '123456789';
        const msgBuf = Buffer.from(sessionId);
        const signature = eddsa.signMiMC(privateKey, msgBuf);

        // Convert public key and signature to bit arrays
        const pubKeyBits = eddsa.pubKey2Bits(publicKey);
        const sigR8Bits = eddsa.r8Bits(signature.R8);
        const sigSBits = eddsa.sBits(signature.S);

        const input = {
            sessionId,
            timestamp: Math.floor(Date.now() / 1000),
            therapistPubKey: pubKeyBits,
            metricsHash: '0x5678',
            durationMinutes: 200, // > MAX_DURATION (180)
            interventionCount: 5,
            riskLevel: 3,
            engagementScore: 85,
            clientDataHash: '0x9abc',
            therapistSigR8: sigR8Bits,
            therapistSigS: sigSBits
        };

        await expect(circuit.calculateWitness(input)).rejects.toThrow();
    });

    it('should reject invalid intervention count', async () => {
        // Generate valid EdDSA keypair
        const privateKey = randomBytes(32);
        const publicKey = eddsa.prv2pub(privateKey);

        // Create signature for session ID
        const sessionId = '123456789';
        const msgBuf = Buffer.from(sessionId);
        const signature = eddsa.signMiMC(privateKey, msgBuf);

        // Convert public key and signature to bit arrays
        const pubKeyBits = eddsa.pubKey2Bits(publicKey);
        const sigR8Bits = eddsa.r8Bits(signature.R8);
        const sigSBits = eddsa.sBits(signature.S);

        const input = {
            sessionId,
            timestamp: Math.floor(Date.now() / 1000),
            therapistPubKey: pubKeyBits,
            metricsHash: '0x5678',
            durationMinutes: 60,
            interventionCount: 51, // > MAX_INTERVENTIONS (50)
            riskLevel: 3,
            engagementScore: 85,
            clientDataHash: '0x9abc',
            therapistSigR8: sigR8Bits,
            therapistSigS: sigSBits
        };

        await expect(circuit.calculateWitness(input)).rejects.toThrow();
    });

    it('should reject invalid risk level', async () => {
        // Generate valid EdDSA keypair
        const privateKey = randomBytes(32);
        const publicKey = eddsa.prv2pub(privateKey);

        // Create signature for session ID
        const sessionId = '123456789';
        const msgBuf = Buffer.from(sessionId);
        const signature = eddsa.signMiMC(privateKey, msgBuf);

        // Convert public key and signature to bit arrays
        const pubKeyBits = eddsa.pubKey2Bits(publicKey);
        const sigR8Bits = eddsa.r8Bits(signature.R8);
        const sigSBits = eddsa.sBits(signature.S);

        const input = {
            sessionId,
            timestamp: Math.floor(Date.now() / 1000),
            therapistPubKey: pubKeyBits,
            metricsHash: '0x5678',
            durationMinutes: 60,
            interventionCount: 5,
            riskLevel: 11, // > MAX_RISK_LEVEL (10)
            engagementScore: 85,
            clientDataHash: '0x9abc',
            therapistSigR8: sigR8Bits,
            therapistSigS: sigSBits
        };

        await expect(circuit.calculateWitness(input)).rejects.toThrow();
    });

    it('should reject invalid engagement score', async () => {
        // Generate valid EdDSA keypair
        const privateKey = randomBytes(32);
        const publicKey = eddsa.prv2pub(privateKey);

        // Create signature for session ID
        const sessionId = '123456789';
        const msgBuf = Buffer.from(sessionId);
        const signature = eddsa.signMiMC(privateKey, msgBuf);

        // Convert public key and signature to bit arrays
        const pubKeyBits = eddsa.pubKey2Bits(publicKey);
        const sigR8Bits = eddsa.r8Bits(signature.R8);
        const sigSBits = eddsa.sBits(signature.S);

        const input = {
            sessionId,
            timestamp: Math.floor(Date.now() / 1000),
            therapistPubKey: pubKeyBits,
            metricsHash: '0x5678',
            durationMinutes: 60,
            interventionCount: 5,
            riskLevel: 3,
            engagementScore: 101, // > MAX_ENGAGEMENT (100)
            clientDataHash: '0x9abc',
            therapistSigR8: sigR8Bits,
            therapistSigS: sigSBits
        };

        await expect(circuit.calculateWitness(input)).rejects.toThrow();
    });

    it('should reject future timestamp', async () => {
        // Generate valid EdDSA keypair
        const privateKey = randomBytes(32);
        const publicKey = eddsa.prv2pub(privateKey);

        // Create signature for session ID
        const sessionId = '123456789';
        const msgBuf = Buffer.from(sessionId);
        const signature = eddsa.signMiMC(privateKey, msgBuf);

        // Convert public key and signature to bit arrays
        const pubKeyBits = eddsa.pubKey2Bits(publicKey);
        const sigR8Bits = eddsa.r8Bits(signature.R8);
        const sigSBits = eddsa.sBits(signature.S);

        const input = {
            sessionId,
            timestamp: Math.floor(Date.now() / 1000) + 3600, // 1 hour in future
            therapistPubKey: pubKeyBits,
            metricsHash: '0x5678',
            durationMinutes: 60,
            interventionCount: 5,
            riskLevel: 3,
            engagementScore: 85,
            clientDataHash: '0x9abc',
            therapistSigR8: sigR8Bits,
            therapistSigS: sigSBits
        };

        await expect(circuit.calculateWitness(input)).rejects.toThrow();
    });

    it('should reject old timestamp', async () => {
        // Generate valid EdDSA keypair
        const privateKey = randomBytes(32);
        const publicKey = eddsa.prv2pub(privateKey);

        // Create signature for session ID
        const sessionId = '123456789';
        const msgBuf = Buffer.from(sessionId);
        const signature = eddsa.signMiMC(privateKey, msgBuf);

        // Convert public key and signature to bit arrays
        const pubKeyBits = eddsa.pubKey2Bits(publicKey);
        const sigR8Bits = eddsa.r8Bits(signature.R8);
        const sigSBits = eddsa.sBits(signature.S);

        const input = {
            sessionId,
            timestamp: Math.floor(Date.now() / 1000) - (31 * 24 * 3600), // 31 days old
            therapistPubKey: pubKeyBits,
            metricsHash: '0x5678',
            durationMinutes: 60,
            interventionCount: 5,
            riskLevel: 3,
            engagementScore: 85,
            clientDataHash: '0x9abc',
            therapistSigR8: sigR8Bits,
            therapistSigS: sigSBits
        };

        await expect(circuit.calculateWitness(input)).rejects.toThrow();
    });

    it('should reject invalid therapist signature', async () => {
        // Generate valid EdDSA keypair
        const privateKey = randomBytes(32);
        const publicKey = eddsa.prv2pub(privateKey);

        // Create signature for session ID
        const sessionId = '123456789';
        const msgBuf = Buffer.from(sessionId);
        const signature = eddsa.signMiMC(privateKey, msgBuf);

        // Convert public key and signature to bit arrays
        const pubKeyBits = eddsa.pubKey2Bits(publicKey);
        const sigR8Bits = eddsa.r8Bits(signature.R8);
        const sigSBits = eddsa.sBits(signature.S);

        const input = {
            sessionId,
            timestamp: Math.floor(Date.now() / 1000),
            therapistPubKey: pubKeyBits,
            metricsHash: '0x5678',
            durationMinutes: 60,
            interventionCount: 5,
            riskLevel: 3,
            engagementScore: 85,
            clientDataHash: '0x9abc',
            therapistSigR8: eddsa.r8Bits(Buffer.from('wrong signature', 'utf8')),
            therapistSigS: eddsa.sBits(Buffer.from('wrong signature', 'utf8'))
        };

        await expect(circuit.calculateWitness(input)).rejects.toThrow();
    });

    it('should reject tampered metrics hash', async () => {
        // Generate valid EdDSA keypair
        const privateKey = randomBytes(32);
        const publicKey = eddsa.prv2pub(privateKey);

        // Create signature for session ID
        const sessionId = '123456789';
        const msgBuf = Buffer.from(sessionId);
        const signature = eddsa.signMiMC(privateKey, msgBuf);

        // Convert public key and signature to bit arrays
        const pubKeyBits = eddsa.pubKey2Bits(publicKey);
        const sigR8Bits = eddsa.r8Bits(signature.R8);
        const sigSBits = eddsa.sBits(signature.S);

        const input = {
            sessionId,
            timestamp: Math.floor(Date.now() / 1000),
            therapistPubKey: pubKeyBits,
            metricsHash: '0x1234', // Tampered metrics hash
            durationMinutes: 60,
            interventionCount: 5,
            riskLevel: 3,
            engagementScore: 85,
            clientDataHash: '0x9abc',
            therapistSigR8: sigR8Bits,
            therapistSigS: sigSBits
        };

        await expect(circuit.calculateWitness(input)).rejects.toThrow();
    });
});
