import { parentPort } from 'worker_threads';
import * as snarkjs from 'snarkjs';

if (!parentPort) {
    throw new Error('This module must be run as a worker thread');
}

parentPort.on('message', async (data) => {
    try {
        switch (data.type) {
            case 'generate':
                const { input, wasmPath, zkeyPath } = data;
                
                // Generate witness
                const { witness } = await snarkjs.wtns.full(
                    input,
                    wasmPath,
                    { logFunction: () => {} }
                );

                // Generate proof
                const { proof, publicSignals } = await snarkjs.groth16.prove(
                    zkeyPath,
                    witness
                );

                parentPort!.postMessage({ proof: { proof, publicSignals } });
                break;

            case 'verify':
                const { proof: proofData, vKey } = data;
                
                // Verify proof
                const isValid = await snarkjs.groth16.verify(
                    vKey.key,
                    proofData.publicSignals,
                    proofData.proof
                );

                parentPort!.postMessage({ isValid });
                break;

            default:
                throw new Error(`Unknown operation type: ${data.type}`);
        }
    } catch (error) {
        parentPort!.postMessage({ error: error.message });
    }
});
