import * as snarkjs from 'snarkjs';
import * as circomlibjs from 'circomlibjs';
import path from 'path';
import { SecurityAuditService } from './SecurityAuditService';

export class ZKProofService {
    private readonly circuitPath: string;
    private readonly keyPath: string;
    private readonly securityAuditService: SecurityAuditService;

    constructor(securityAuditService: SecurityAuditService) {
        this.circuitPath = path.join(__dirname, '../zk/circuits');
        this.keyPath = path.join(__dirname, '../zk/keys');
        this.securityAuditService = securityAuditService;
    }

    async generateProof(
        sessionId: string,
        timestamp: number,
        therapistPubKey: Uint8Array,
        sessionData: Uint8Array[],
        signature: { R8: Uint8Array; S: Uint8Array }
    ): Promise<{ proof: any; publicSignals: any }> {
        try {
            // Convert inputs to the format expected by the circuit
            const input = {
                sessionId: sessionId,
                timestamp: timestamp,
                therapistPubKey: Array.from(therapistPubKey).map(b => b.toString()),
                sessionData: sessionData.map(d => Array.from(d).map(b => b.toString())),
                therapistSigR8: Array.from(signature.R8).map(b => b.toString()),
                therapistSigS: Array.from(signature.S).map(b => b.toString())
            };

            // Generate the proof
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                input,
                path.join(this.circuitPath, 'SessionDataCircuit.wasm'),
                path.join(this.keyPath, 'session_proving_key.zkey')
            );

            await this.securityAuditService.recordAlert(
                'ZK_PROOF_GENERATED',
                'LOW',
                { sessionId, timestamp }
            );

            return { proof, publicSignals };
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'ZK_PROOF_ERROR',
                'HIGH',
                { sessionId, error: error.message }
            );
            throw error;
        }
    }

    async verifyProof(
        proof: any,
        publicSignals: any
    ): Promise<boolean> {
        try {
            const vKey = require(path.join(this.keyPath, 'verification_key.json'));
            const isValid = await snarkjs.groth16.verify(
                vKey,
                publicSignals,
                proof
            );

            await this.securityAuditService.recordAlert(
                'ZK_PROOF_VERIFIED',
                'LOW',
                { isValid }
            );

            return isValid;
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'ZK_PROOF_VERIFICATION_ERROR',
                'HIGH',
                { error: error.message }
            );
            throw error;
        }
    }

    async compileCircuit(): Promise<void> {
        // This should be called during deployment/setup, not in runtime
        try {
            const { exec } = require('child_process');
            const circuitName = 'SessionDataCircuit';
            const circuitPath = path.join(this.circuitPath, `${circuitName}.circom`);
            
            // Compile circuit
            await new Promise((resolve, reject) => {
                exec(`circom ${circuitPath} --r1cs --wasm --sym`, (error: any) => {
                    if (error) reject(error);
                    else resolve(null);
                });
            });

            await this.securityAuditService.recordAlert(
                'ZK_CIRCUIT_COMPILED',
                'LOW',
                { circuitName }
            );
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'ZK_CIRCUIT_COMPILATION_ERROR',
                'HIGH',
                { error: error.message }
            );
            throw error;
        }
    }
}
