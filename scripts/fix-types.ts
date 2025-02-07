import * as ts from 'typescript';
import * as fs from 'fs/promises';
import * as path from 'path';

interface Fix {
    file: string;
    fixes: {
        start: number;
        end: number;
        replacement: string;
    }[];
}

async function fixAnyTypes(sourceFile: string): Promise<Fix | null> {
    const program = ts.createProgram([sourceFile], {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
    });

    const fixes: Fix['fixes'] = [];
    const checker = program.getTypeChecker();
    const source = program.getSourceFile(sourceFile);

    if (!source) return null;

    function visit(node: ts.Node) {
        if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && node.typeName.text === 'any') {
            // Replace 'any' with 'unknown' as a safer alternative
            fixes.push({
                start: node.getStart(),
                end: node.getEnd(),
                replacement: 'unknown',
            });
        }

        if (ts.isParameter(node)) {
            // Handle double type annotations (e.g., p: unknown: unknown)
            if (node.type && ts.isTypeReferenceNode(node.type) &&
                ts.isIdentifier(node.type.typeName) && node.type.typeName.text === 'unknown') {
                const nextToken = node.getChildren().find(child =>
                    child.kind === ts.SyntaxKind.ColonToken);
                if (nextToken) {
                    // Remove the entire type annotation
                    fixes.push({
                        start: node.getStart(),
                        end: node.getEnd(),
                        replacement: node.name.getText(),
                    });
                }
            }
            // Add type annotation for parameters without types
            else if (!node.type) {
                const type = checker.getTypeAtLocation(node);
                const typeText = checker.typeToString(type);

                if (typeText === 'any') {
                    fixes.push({
                        start: node.getEnd(),
                        end: node.getEnd(),
                        replacement: '',  // Don't add type annotation
                    });
                }
            }
        }

        if (ts.isPropertySignature(node) && !node.type) {
            // Add type annotation for interface properties without types
            const type = checker.getTypeAtLocation(node);
            const typeText = checker.typeToString(type);

            if (typeText === 'any') {
                fixes.push({
                    start: node.getEnd(),
                    end: node.getEnd(),
                    replacement: ': unknown',
                });
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(source);

    if (fixes.length === 0) return null;

    return {
        file: sourceFile,
        fixes,
    };
}

async function applyFixes(fix: Fix) {
    const content = await fs.readFile(fix.file, 'utf-8');
    let result = content;
    let offset = 0;

    for (const { start, end, replacement } of fix.fixes) {
        const before = result.slice(0, start + offset);
        const after = result.slice(end + offset);
        result = before + replacement + after;
        offset += replacement.length - (end - start);
    }

    await fs.writeFile(fix.file, result);
}

async function main() {
    const migrationStatus = JSON.parse(
        await fs.readFile('migration-status.json', 'utf-8')
    );

    const nonStrictFiles = migrationStatus.results.nonStrict;
    console.log(`Processing ${nonStrictFiles.length} files...`);

    let fixedFiles = 0;
    let totalFixes = 0;

    for (const file of nonStrictFiles) {
        const fixes = await fixAnyTypes(file);
        if (fixes) {
            await applyFixes(fixes);
            fixedFiles++;
            totalFixes += fixes.fixes.length;
            console.log(`Fixed ${fixes.fixes.length} issues in ${file}`);
        }
    }

    console.log(`\nSummary:`);
    console.log(`- Processed ${nonStrictFiles.length} files`);
    console.log(`- Fixed ${totalFixes} issues in ${fixedFiles} files`);
}

main().catch(console.error);

