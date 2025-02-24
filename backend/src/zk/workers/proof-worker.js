const { parentPort } = require('worker_threads');
const snarkjs = require('snarkjs');
const path = require('path');

parentPort.on('message', async (data) => {
    try {
        if (data.type !== 'generate') {
            throw new Error('Invalid worker message type');
        }

        const { input, circuitPath } = data;

        // Generate the proof
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            circuitPath,
            path.join(path.dirname(circuitPath), '../keys/session_proving_key.zkey')
        );

        // Send the result back
        parentPort.postMessage({ proof, publicSignals });
    } catch (error) {
        parentPort.postMessage({
            error: error instanceof Error ? error.message : 'Unknown error in proof generation'
        });
    }
}); 