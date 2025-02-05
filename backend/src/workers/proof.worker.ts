import { parentPort, workerData } from 'worker_threads';
import * as snarkjs from 'snarkjs';
import { ProofOutput } from '../zk/types';

interface WorkerMessage {
    type: 'generate' | 'verify';
    input?: any;
    proof?: ProofOutput;
    vKey?: any;
    wasmPath?: string;
    zkeyPath?: string;
}

if (!parentPort) {
    throw new Error('This module must be run as a worker thread');
}

parentPort.on('message', async (message: WorkerMessage) => {
    try {
        if (message.type === 'generate') {
            if (!message.input || !message.wasmPath || !message.zkeyPath) {
                throw new Error('Missing required parameters for proof generation');
            }

            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                message.input,
                message.wasmPath,
                message.zkeyPath
            );

            parentPort!.postMessage({ proof: { proof, publicSignals } });
        } else if (message.type === 'verify') {
            if (!message.proof || !message.vKey) {
                throw new Error('Missing required parameters for proof verification');
            }

            const isValid = await snarkjs.groth16.verify(
                message.vKey,
                message.proof.publicSignals,
                message.proof.proof
            );

            parentPort!.postMessage({ isValid });
        } else {
            throw new Error(`Unknown message type: ${message.type}`);
        }
    } catch (error) {
        parentPort!.postMessage({ 
            error: error instanceof Error ? error.message : 'Unknown error in worker'
        });
    }
});
