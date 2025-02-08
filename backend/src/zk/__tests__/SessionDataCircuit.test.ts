import * as snarkjs from 'snarkjs';
import path from 'path';
import crypto from 'crypto';
import { ZKUtils, SessionMetadata, TherapistCredential } from "@/types";
import wasm_tester from 'wasm-tester';
describe('SessionDataCircuit', () => {
    const circuitWasmPath = path.join(__dirname, '../build/SessionDataCircuit.wasm');
    const circuitZKeyPath = path.join(__dirname, '../keys/SessionDataCircuit.zkey');
    const verificationKeyPath = path.join(__dirname, '../keys/verification_key.json');
    // Helper function to generate test data
    const generateTestData = () => {
        const sessionId = crypto.randomBytes(32).toString('hex');
        const startTimestamp = Math.floor(Date.now() / 1000);
        const endTimestamp = startTimestamp + 3600; // 1 hour session
        const therapistPubKey = crypto.randomBytes(32);
        const sessionData = Array(8).fill(null).map(() => crypto.randomBytes(32));
        const metadata: SessionMetadata = {
            isEmergency: false,
            isRecorded: true,
            isSupervised: true,
            isTraining: false
        };
        const therapistCredential: TherapistCredential = {
            licenseHash: crypto.randomBytes(32).toString('hex'),
            specializationHash: crypto.randomBytes(32).toString('hex'),
            certificationHash: crypto.randomBytes(32).toString('hex'),
            statusHash: crypto.randomBytes(32).toString('hex')
        };
        const signature = {
            R8: crypto.randomBytes(32),
            S: crypto.randomBytes(32)
        };
        return {
            sessionId,
            startTimestamp,
            endTimestamp,
            therapistPubKey,
            sessionData,
            metadata,
            therapistCredential,
            signature
        };
    };
    it('should generate and verify valid proof for valid input', async () => {
        const testData = generateTestData();
        const credentialHash = await ZKUtils.hashCredential(testData.therapistCredential);
        const input = {
            sessionId: testData.sessionId,
            startTimestamp: testData.startTimestamp,
            endTimestamp: testData.endTimestamp,
            therapistPubKey: Array.from(testData.therapistPubKey),
            therapistCredentialHash: credentialHash,
            maxSessionDuration: 7200,
            sessionData: testData.sessionData.map(d, unknown => Array.from(d)),
            metadataFlags: ZKUtils.metadataToFlags(testData.metadata),
            therapistCredential: ZKUtils.credentialToArray(testData.therapistCredential),
            therapistSigR8: Array.from(testData.signature.R8),
            therapistSigS: Array.from(testData.signature.S)
        };
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, circuitWasmPath, circuitZKeyPath);
        const vKey = require(verificationKeyPath);
        const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        expect(isValid).toBe(true);
    }, 30000);
    it('should reject proof with invalid session duration', async () => {
        const testData = generateTestData();
        testData.endTimestamp = testData.startTimestamp - 1; // Invalid duration
        const credentialHash = await ZKUtils.hashCredential(testData.therapistCredential);
        const input = {
            sessionId: testData.sessionId,
            startTimestamp: testData.startTimestamp,
            endTimestamp: testData.endTimestamp,
            therapistPubKey: Array.from(testData.therapistPubKey),
            therapistCredentialHash: credentialHash,
            maxSessionDuration: 7200,
            sessionData: testData.sessionData.map(d, unknown => Array.from(d)),
            metadataFlags: ZKUtils.metadataToFlags(testData.metadata),
            therapistCredential: ZKUtils.credentialToArray(testData.therapistCredential),
            therapistSigR8: Array.from(testData.signature.R8),
            therapistSigS: Array.from(testData.signature.S)
        };
        await expect(snarkjs.groth16.fullProve(input, circuitWasmPath, circuitZKeyPath)).rejects.toThrow();
    }, 30000);
    it('should reject proof with invalid credential hash', async () => {
        const testData = generateTestData();
        const credentialHash = await ZKUtils.hashCredential(testData.therapistCredential);
        // Modify credential after hash calculation
        testData.therapistCredential.licenseHash = crypto.randomBytes(32).toString('hex');
        const input = {
            sessionId: testData.sessionId,
            startTimestamp: testData.startTimestamp,
            endTimestamp: testData.endTimestamp,
            therapistPubKey: Array.from(testData.therapistPubKey),
            therapistCredentialHash: credentialHash,
            maxSessionDuration: 7200,
            sessionData: testData.sessionData.map(d, unknown => Array.from(d)),
            metadataFlags: ZKUtils.metadataToFlags(testData.metadata),
            therapistCredential: ZKUtils.credentialToArray(testData.therapistCredential),
            therapistSigR8: Array.from(testData.signature.R8),
            therapistSigS: Array.from(testData.signature.S)
        };
        await expect(snarkjs.groth16.fullProve(input, circuitWasmPath, circuitZKeyPath)).rejects.toThrow();
    }, 30000);
    it('should handle emergency session flags correctly', async () => {
        const testData = generateTestData();
        testData.metadata.isEmergency = true;
        const credentialHash = await ZKUtils.hashCredential(testData.therapistCredential);
        const input = {
            sessionId: testData.sessionId,
            startTimestamp: testData.startTimestamp,
            endTimestamp: testData.endTimestamp,
            therapistPubKey: Array.from(testData.therapistPubKey),
            therapistCredentialHash: credentialHash,
            maxSessionDuration: 7200,
            sessionData: testData.sessionData.map(d, unknown => Array.from(d)),
            metadataFlags: ZKUtils.metadataToFlags(testData.metadata),
            therapistCredential: ZKUtils.credentialToArray(testData.therapistCredential),
            therapistSigR8: Array.from(testData.signature.R8),
            therapistSigS: Array.from(testData.signature.S)
        };
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, circuitWasmPath, circuitZKeyPath);
        const vKey = require(verificationKeyPath);
        const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        expect(isValid).toBe(true);
        expect(input.metadataFlags[0]).toBe(1); // Emergency flag should be set
    }, 30000);
    it('should generate valid proof for session data', async () => {
        const testData = {
            sessionData: [
                Buffer.from('test-data-1'),
                Buffer.from('test-data-2'),
            ],
        };
        const input = {
            sessionData: testData.sessionData.map((d: any) => Array.from(d)),
            timestamp: Date.now(),
            nonce: crypto.randomBytes(32),
        };
        const circuit = await wasm_tester(path.join(__dirname, 'SessionData.circom'));
        const witness = await circuit.calculateWitness(input);
        expect(witness[1]).toBeDefined();
    });
});
