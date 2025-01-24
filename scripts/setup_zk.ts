import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as snarkjs from 'snarkjs';

const CIRCUIT_NAME = 'session_integrity';
const PHASE1_PATH = 'pot15_final.ptau';
const BUILD_DIR = path.join(process.cwd(), 'build', 'circuits');
const CIRCUIT_DIR = path.join(process.cwd(), 'src', 'circuits');
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'circuits');

async function main() {
    try {
        console.log('Setting up ZK system...');

        // Create necessary directories
        [BUILD_DIR, PUBLIC_DIR].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        // Download Powers of Tau file if not exists
        if (!fs.existsSync(path.join(BUILD_DIR, PHASE1_PATH))) {
            console.log('Downloading Powers of Tau file...');
            const command = process.platform === 'win32'
                ? `curl.exe -L -o "${path.join(BUILD_DIR, PHASE1_PATH)}" https://hermez.s3-eu-west-1.amazonaws.com/${PHASE1_PATH}`
                : `curl -o "${path.join(BUILD_DIR, PHASE1_PATH)}" https://hermez.s3-eu-west-1.amazonaws.com/${PHASE1_PATH}`;
            execSync(command, { stdio: 'inherit' });
        }

        // Compile circuit
        console.log('Compiling circuit...');
        const circomPath = process.platform === 'win32'
            ? path.join(process.env.APPDATA || '', 'npm', 'circom.cmd')
            : 'circom';
        
        const circuitPath = path.join(CIRCUIT_DIR, CIRCUIT_NAME + '.circom');
        const command = `"${circomPath}" "${circuitPath}" --r1cs --wasm --sym --c -o "${BUILD_DIR}"`;
        
        execSync(command, { stdio: 'inherit' });

        // Generate initial zKey
        console.log('Generating initial proving key...');
        await snarkjs.zKey.newZKey(
            path.join(BUILD_DIR, CIRCUIT_NAME + '.r1cs'),
            path.join(BUILD_DIR, PHASE1_PATH),
            path.join(BUILD_DIR, CIRCUIT_NAME + '_0.zkey')
        );

        // Contribute to phase 2 ceremony (first contribution)
        console.log('First contribution to ceremony...');
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);
        await snarkjs.zKey.contribute(
            path.join(BUILD_DIR, CIRCUIT_NAME + '_0.zkey'),
            path.join(BUILD_DIR, CIRCUIT_NAME + '_1.zkey'),
            'First contribution',
            randomBytes
        );

        // Second contribution (optional but recommended)
        console.log('Second contribution to ceremony...');
        await snarkjs.zKey.contribute(
            path.join(BUILD_DIR, CIRCUIT_NAME + '_1.zkey'),
            path.join(BUILD_DIR, CIRCUIT_NAME + '_2.zkey'),
            'Second contribution',
            randomBytes
        );

        // Verify final zKey
        console.log('Verifying final proving key...');
        const verifyOk = await snarkjs.zKey.verifyFromR1cs(
            path.join(BUILD_DIR, CIRCUIT_NAME + '.r1cs'),
            path.join(BUILD_DIR, PHASE1_PATH),
            path.join(BUILD_DIR, CIRCUIT_NAME + '_2.zkey')
        );

        if (!verifyOk) {
            throw new Error('Invalid proving key');
        }

        // Export verification key
        console.log('Exporting verification key...');
        const vKey = await snarkjs.zKey.exportVerificationKey(
            path.join(BUILD_DIR, CIRCUIT_NAME + '_2.zkey')
        );
        fs.writeFileSync(
            path.join(BUILD_DIR, CIRCUIT_NAME + '_verification_key.json'),
            JSON.stringify(vKey, null, 2)
        );

        // Generate Solidity verifier (optional, for blockchain verification)
        console.log('Generating Solidity verifier...');
        await snarkjs.zKey.exportSolidityVerifier(
            path.join(BUILD_DIR, CIRCUIT_NAME + '_2.zkey'),
            path.join(BUILD_DIR, CIRCUIT_NAME + '_verifier.sol')
        );

        // Copy necessary files to public directory
        console.log('Copying files to public directory...');
        fs.copyFileSync(
            path.join(BUILD_DIR, CIRCUIT_NAME + '_js', CIRCUIT_NAME + '.wasm'),
            path.join(PUBLIC_DIR, CIRCUIT_NAME + '.wasm')
        );
        fs.copyFileSync(
            path.join(BUILD_DIR, CIRCUIT_NAME + '_2.zkey'),
            path.join(PUBLIC_DIR, CIRCUIT_NAME + '.zkey')
        );
        fs.copyFileSync(
            path.join(BUILD_DIR, CIRCUIT_NAME + '_verification_key.json'),
            path.join(PUBLIC_DIR, CIRCUIT_NAME + '_verification_key.json')
        );

        console.log('ZK setup completed successfully!');
        
        // Generate and verify a test proof
        console.log('Generating test proof...');
        const input = {
            sessionId: "123",
            timestamp: Date.now(),
            durationMinutes: 60,
            publicMetricsHash: "0x123",
            clientDataHash: "0x456",
            metricsHash: "0x789",
            therapistId: "0xabc",
            interventionCount: 5,
            riskLevel: 3,
            engagementScore: 85
        };

        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            path.join(PUBLIC_DIR, CIRCUIT_NAME + '.wasm'),
            path.join(PUBLIC_DIR, CIRCUIT_NAME + '.zkey')
        );

        console.log('Verifying test proof...');
        const isValid = await snarkjs.groth16.verify(
            vKey,
            publicSignals,
            proof
        );

        if (!isValid) {
            throw new Error('Test proof verification failed');
        }

        console.log('Test proof verified successfully!');
        
    } catch (error) {
        console.error('Error during ZK setup:', error);
        process.exit(1);
    }
}

main();
