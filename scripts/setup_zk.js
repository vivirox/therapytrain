import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as snarkjs from 'snarkjs';
import { randomBytes } from 'crypto';
import { buildEddsa } from 'circomlibjs';

const CIRCUIT_NAME = 'session_integrity';
const PHASE1_PATH = 'pot14_final.ptau';
const BUILD_DIR = path.join(process.cwd(), 'build', 'circuits');
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'circuits');
const CIRCUIT_DIR = path.join(process.cwd(), 'src', 'circuits');

function generateRandomEntropy() {
    return randomBytes(32).toString('hex');
}

async function main() {
    try {
        console.log('Setting up ZK system...');

        // Create necessary directories
        try {
            console.log('Creating necessary directories...');
            await Promise.all([BUILD_DIR, PUBLIC_DIR].map(async dir => {
                console.log(`Creating directory if not exists: ${dir}`);
                if (!(await fs.stat(dir).catch(() => null))) {
                    await fs.mkdir(dir, { recursive: true });
                }
            }));
        } catch (error) {
            console.error('Error creating directories:', error);
            if (error instanceof Error) {
                console.error('Stack:', error.stack);
            }
            throw error;
        }

        // Download Powers of Tau file
        console.log('Downloading Powers of Tau file...');
        try {
            const powersOfTauUrl = 'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau';
            const powersOfTauPath = path.join(BUILD_DIR, 'pot14_final.ptau');

            console.log(`Checking if Powers of Tau file exists at: ${powersOfTauPath}`);
            if (!(await fs.stat(powersOfTauPath).catch(() => null))) {
                console.log('Downloading Powers of Tau file...');
                execSync(`curl -L -o "${powersOfTauPath}" "${powersOfTauUrl}"`, { stdio: 'inherit' });
            } else {
                console.log('Powers of Tau file already exists');
            }
        } catch (error) {
            console.error('Error downloading Powers of Tau file:', error);
            if (error instanceof Error) {
                console.error('Stack:', error.stack);
            }
            throw error;
        }

        // Compile circuit
        console.log('Compiling circuit...');
        try {
            const circomPath = process.platform === 'win32'
                ? path.join(process.env.APPDATA || '', 'npm', 'circom.cmd')
                : 'circom';

            const circuitPath = path.join(CIRCUIT_DIR, CIRCUIT_NAME + '.circom');
            console.log(`Circuit path: ${circuitPath}`);
            console.log(`Circom path: ${circomPath}`);
            
            const command = `"${circomPath}" "${circuitPath}" --r1cs --wasm --sym --c -o "${BUILD_DIR}" --O2 -l circomlib/circuits`;
            console.log(`Running command: ${command}`);

            execSync(command, { stdio: 'inherit' });
        } catch (error) {
            console.error('Error compiling circuit:', error);
            if (error instanceof Error) {
                console.error('Stack:', error.stack);
            }
            throw error;
        }

        // Print circuit statistics
        console.log('Analyzing circuit complexity...');
        try {
            const r1csInfo = execSync(`snarkjs r1cs info "${BUILD_DIR}/${CIRCUIT_NAME}.r1cs"`, { encoding: 'utf8' });
            console.log(r1csInfo);
        } catch (error) {
            console.error('Error analyzing circuit:', error);
            if (error instanceof Error) {
                console.error('Stack:', error.stack);
            }
            throw error;
        }

        // Generate initial zKey
        console.log('Generating initial proving key...');
        try {
            await snarkjs.zKey.newZKey(
                path.join(BUILD_DIR, CIRCUIT_NAME + '.r1cs'),
                path.join(BUILD_DIR, PHASE1_PATH),
                path.join(BUILD_DIR, CIRCUIT_NAME + '_0.zkey')
            );
        } catch (error) {
            console.error('Error generating initial proving key:', error);
            if (error instanceof Error) {
                console.error('Stack:', error.stack);
            }
            throw error;
        }

        // Contribute to phase 2 ceremony
        console.log('Contributing to phase 2 ceremony...');
        try {
            await snarkjs.zKey.contribute(
                path.join(BUILD_DIR, CIRCUIT_NAME + '_0.zkey'),
                path.join(BUILD_DIR, CIRCUIT_NAME + '_1.zkey'),
                'First contribution',
                generateRandomEntropy()
            );
        } catch (error) {
            console.error('Error contributing to phase 2 ceremony:', error);
            if (error instanceof Error) {
                console.error('Stack:', error.stack);
            }
            throw error;
        }

        // Generate verification key
        console.log('Generating verification key...');
        let vKey;
        try {
            vKey = await snarkjs.zKey.exportVerificationKey(
                path.join(BUILD_DIR, CIRCUIT_NAME + '_1.zkey')
            );

            await fs.writeFile(
                path.join(PUBLIC_DIR, CIRCUIT_NAME + '_verification_key.json'),
                JSON.stringify(vKey, null, 2)
            );
        } catch (error) {
            console.error('Error generating verification key:', error);
            if (error instanceof Error) {
                console.error('Stack:', error.stack);
            }
            throw error;
        }

        // Export solidity verifier
        console.log('Generating Solidity verifier...');
        try {
            const solidityVerifier = await snarkjs.zKey.exportSolidityVerifier(
                path.join(BUILD_DIR, CIRCUIT_NAME + '_1.zkey'),
                { groth16: path.join(BUILD_DIR, CIRCUIT_NAME + '_verifier_template.sol') }
            );

            await fs.writeFile(
                path.join(BUILD_DIR, CIRCUIT_NAME + '_verifier.sol'),
                solidityVerifier
            );
        } catch (error) {
            console.error('Error generating Solidity verifier:', error);
            if (error instanceof Error) {
                console.error('Stack:', error.stack);
            }
            throw error;
        }

        // Test the circuit
        console.log('Testing circuit...');
        // TODO: Fix test runner crash
        // const testResult = execSync('bun test src/circuits/__tests__', { encoding: 'utf8' });
        // console.log(testResult);
        console.log('Skipping tests due to runner crash - needs investigation');

        // Generate example proof
        console.log('Generating example proof...');
        try {
            const eddsa = await buildEddsa();

            // Generate private key as a field element
            const privateKey = Buffer.from(randomBytes(32));
            const publicKey = eddsa.prv2pub(privateKey);

            // Create message hash using MiMC
            const F = eddsa.F;
            const msgHash = F.e('123456789');
            const signature = eddsa.signMiMC(privateKey, msgHash);

            // Helper function to convert field element to bits
            const fieldToBits = (f) => {
                const bytes = new Uint8Array(32);
                F.toRprBE(bytes, 0, F.e(f));
                let bits = [];
                for (let i = 0; i < bytes.length; i++) {
                    for (let j = 7; j >= 0; j--) {
                        bits.push((bytes[i] >> j) & 1);
                    }
                }
                return bits;
            };

            // Helper function to convert point to bits
            const pointToBits = (point) => {
                const xBits = fieldToBits(point[0]);
                const yBits = fieldToBits(point[1]);
                return [...xBits, ...yBits];
            };

            // Helper function to convert number to bits
            const numberToBits = (num, bits = 64) => {
                const binary = BigInt(num).toString(2).padStart(bits, '0');
                return Array.from(binary).map(Number);
            };

            // Convert inputs to bits
            const sessionIdBits = numberToBits(123456789n, 64);
            const pubKeyBits = pointToBits(publicKey);
            const sigR8Bits = pointToBits(signature.R8);
            const sigSBits = fieldToBits(signature.S);

            const input = {
                sessionId: sessionIdBits,
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

            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                input,
                path.join(BUILD_DIR, CIRCUIT_NAME + '_js', CIRCUIT_NAME + '.wasm'),
                path.join(BUILD_DIR, CIRCUIT_NAME + '_1.zkey')
            );

            // Verify the proof
            const verified = await snarkjs.groth16.verify(
                vKey,
                publicSignals,
                proof
            );

            console.log('Example proof verification:', verified);

            // Save example proof and signals
            await fs.writeFile(
                path.join(PUBLIC_DIR, CIRCUIT_NAME + '_example_proof.json'),
                JSON.stringify({ proof, publicSignals }, null, 2)
            );
        } catch (error) {
            console.error('Error generating and verifying example proof:', error);
            if (error instanceof Error) {
                console.error('Stack:', error.stack);
            }
            throw error;
        }

        console.log('ZK system setup completed successfully!');
    } catch (error) {
        console.error('Error setting up ZK system:', error);
        if (error instanceof Error) {
            console.error('Stack:', error.stack);
        }
        process.exit(1);
    }
}

// Run main function
main().catch(error => {
    console.error('Fatal error:', error);
    if (error instanceof Error) {
        console.error('Error stack:', error.stack);
    }
    if (error && typeof error === 'object') {
        console.error('Error details:', JSON.stringify(error, null, 2));
    }
    process.exit(1);
});
