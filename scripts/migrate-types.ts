import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

async function checkFileWithStrictConfig(filePath: string): Promise<boolean> {
    try {
        const { stderr } = await execAsync(`npx tsc ${filePath} --noEmit --project tsconfig.strict.json`);
        return !stderr;
    } catch (error) {
        return false;
    }
}

async function findTypeScriptFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    async function walk(currentDir: string) {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory() && !entry.name.startsWith('node_modules')) {
                await walk(fullPath);
            } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
                files.push(fullPath);
            }
        }
    }

    await walk(dir);
    return files;
}

async function main() {
    const srcDirs = ['src', 'backend/src', 'frontend/src'];
    const allFiles: string[] = [];

    for (const dir of srcDirs) {
        const files = await findTypeScriptFiles(dir);
        allFiles.push(...files);
    }

    console.log(`Found ${allFiles.length} TypeScript files`);

    const results = {
        strict: [] as string[],
        nonStrict: [] as string[],
    };

    for (const file of allFiles) {
        const isStrict = await checkFileWithStrictConfig(file);
        if (isStrict) {
            results.strict.push(file);
        } else {
            results.nonStrict.push(file);
        }

        process.stdout.write(`\rChecked ${results.strict.length + results.nonStrict.length}/${allFiles.length} files`);
    }

    console.log('\n\nResults:');
    console.log(`Strict compliant: ${results.strict.length} files`);
    console.log(`Need migration: ${results.nonStrict.length} files`);

    await fs.writeFile(
        'migration-status.json',
        JSON.stringify({
            timestamp: new Date().toISOString(),
            results,
        }, null, 2)
    );

    console.log('\nMigration status has been saved to migration-status.json');
}

main().catch(console.error); 