import * as snarkjs from 'snarkjs';
import * as fs from 'fs/promises';
import * as path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

async function setupDirectories() {
    const circuitName = 'SessionDataCircuit';
    const circuitsDir = path.join(__dirname, '../circuits');
    const keysDir = path.join(__dirname, '../keys');
    const buildDir = path.join(__dirname, '../build');

    // Create directories if they don't exist
    [keysDir, buildDir].forEach((dir) => {
        fs.mkdir(dir, { recursive: true }).catch((error: unknown) => {
            console.error(`Failed to create directory ${dir}:`, error);
        });
    });

    return { keysDir, buildDir };
}

async function main() {
    try {
        const { keysDir, buildDir } = await setupDirectories();
        console.log('Starting circuit compilation...');

        // Compile circuit
        const circuitPath = path.join(circuitsDir, `${circuitName}.circom`);
        execSync(`circom ${circuitPath} --r1cs --wasm --sym -o ${buildDir}`);

        console.log('Circuit compiled successfully');
        console.log('Starting trusted setup...');

        // Phase 1 - Powers of Tau
        const ptauName = "powersOfTau28_hez_final_12.ptau";
        const ptauPath = path.join(keysDir, ptauName);

        if (!fs.access(ptauPath)) {
            console.log('Generating powers of tau...');
            await snarkjs.powersOfTau.newAccumulator(12);

            // Generate random entropy
            const entropy1 = crypto.randomBytes(32).toString('hex');
            const entropy2 = crypto.randomBytes(32).toString('hex');

            await snarkjs.powersOfTau.contribute(
                path.join(keysDir, "pot12_0.ptau"),
                path.join(keysDir, "pot12_1.ptau"),
                "First contribution",
                entropy1
            );

            await snarkjs.powersOfTau.contribute(
                path.join(keysDir, "pot12_1.ptau"),
                path.join(keysDir, "pot12_2.ptau"),
                "Second contribution",
                entropy2
            );

            await snarkjs.powersOfTau.beacon(
                path.join(keysDir, "pot12_2.ptau"),
                path.join(keysDir, "pot12_beacon.ptau"),
                "Final beacon",
                crypto.randomBytes(32),
                10
            );

            await snarkjs.powersOfTau.preparePhase2(
                path.join(keysDir, "pot12_beacon.ptau"),
                ptauPath
            );
        }

        // Phase 2 - Circuit-specific setup
        console.log('Starting circuit-specific setup...');

        const r1csPath = path.join(buildDir, `${circuitName}.r1cs`);
        const zkeyPath = path.join(keysDir, `${circuitName}.zkey`);
        const vkeyPath = path.join(keysDir, `${circuitName}.vkey.json`);

        await snarkjs.zKey.newZKey(r1csPath, ptauPath, path.join(keysDir, "circuit_0.zkey"));

        // Multiple contributions for better security
        for (let i = 0; i < 3; i++) {
            const entropy = crypto.randomBytes(32).toString('hex');
            await snarkjs.zKey.contribute(
                path.join(keysDir, `circuit_${i}.zkey`),
                path.join(keysDir, `circuit_${i + 1}.zkey`),
                `Contributor ${i + 1}`,
                entropy
            );
        }

        // Apply a random beacon
        await snarkjs.zKey.beacon(
            path.join(keysDir, "circuit_3.zkey"),
            zkeyPath,
            "Final Beacon",
            crypto.randomBytes(32),
            10
        );

        // Export verification key
        console.log('Exporting verification key...');
        const vKey = await snarkjs.zKey.exportVerificationKey(zkeyPath);
        await fs.writeFile(vkeyPath, JSON.stringify(vKey, null, 2));

        // Generate Solidity verifier
        console.log('Generating Solidity verifier...');
        const templates = {
            groth16: path.join(__dirname, '../templates/verifier_groth16.sol')
        };
        const verifierCode = await snarkjs.zKey.exportSolidityVerifier(
            zkeyPath,
            templates
        );
        await fs.writeFile(
            path.join(buildDir, `${circuitName}Verifier.sol`),
            verifierCode
        );

        // Cleanup temporary files
        console.log('Cleaning up temporary files...');
        const filesToCleanup = [
            "pot12_0.ptau",
            "pot12_1.ptau",
            "pot12_2.ptau",
            "pot12_beacon.ptau",
            "circuit_0.zkey",
            "circuit_1.zkey",
            "circuit_2.zkey",
            "circuit_3.zkey"
        ];

        for (const file of filesToCleanup) {
            const filePath = path.join(keysDir, file);
            if (await fs.access(filePath)) {
                await fs.unlink(filePath);
            }
        }

        console.log('Setup completed successfully!');
        console.log(`Keys generated:
- Proving key: ${zkeyPath}
- Verification key: ${vkeyPath}
- Solidity verifier: ${path.join(buildDir, `${circuitName}Verifier.sol`)}`);

    } catch (error) {
        console.error('Error during setup:', error);
        process.exit(1);
    }
}

main().then(() => {
    console.log('Setup script completed');
    process.exit(0);
}).catch((error: unknown) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
