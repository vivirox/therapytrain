import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import glob from 'glob';

interface ModuleInfo {
  name: string;
  exports: Set<string>;
  imports: Set<string>;
}

const moduleMap = new Map<string, ModuleInfo>();
const duplicateTypes = new Set<string>();

function scanSourceFiles(baseDir: string) {
  const files = glob.sync('src/**/*.{ts,tsx}', { cwd: baseDir });
  const program = ts.createProgram(files.map(f => path.join(baseDir, f)), {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    baseUrl: baseDir,
    paths: {
      '@/*': ['src/*']
    }
  });

  const checker = program.getTypeChecker();

  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.fileName.includes('node_modules')) {
      scanFile(sourceFile, checker);
    }
  }
}

function scanFile(sourceFile: ts.SourceFile, checker: ts.TypeChecker) {
  const relativePath = path.relative(process.cwd(), sourceFile.fileName);
  const moduleName = relativePath.replace(/\.(ts|tsx)$/, '');
  
  if (!moduleMap.has(moduleName)) {
    moduleMap.set(moduleName, {
      name: moduleName,
      exports: new Set<string>(),
      imports: new Set<string>()
    });
  }

  const moduleInfo = moduleMap.get(moduleName)!;

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      const importPath = (node.moduleSpecifier as ts.StringLiteral).text;
      if (importPath.startsWith('@/')) {
        moduleInfo.imports.add(importPath);
      }
    }
    else if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier) {
        const exportPath = (node.moduleSpecifier as ts.StringLiteral).text;
        if (exportPath.startsWith('@/')) {
          moduleInfo.exports.add(exportPath);
        }
      }
    }
    else if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      const symbol = checker.getSymbolAtLocation(node.name);
      if (symbol) {
        const declarations = symbol.declarations;
        if (declarations && declarations.length > 1) {
          duplicateTypes.add(node.name.text);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

function generateModuleDeclarations() {
  const missingModules = new Set<string>();
  
  for (const moduleInfo of moduleMap.values()) {
    for (const importPath of moduleInfo.imports) {
      const normalizedPath = importPath.replace('@/', 'src/');
      if (!moduleMap.has(normalizedPath)) {
        missingModules.add(importPath);
      }
    }
  }

  for (const missingModule of missingModules) {
    const modulePath = missingModule.replace('@/', 'src/');
    const dirPath = path.dirname(modulePath);
    
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const declarationFile = path.join(dirPath, 'index.d.ts');
    if (!fs.existsSync(declarationFile)) {
      fs.writeFileSync(declarationFile, `declare module '${missingModule}' {
  // Add type declarations here
  export type * from './types';
  export * from './interfaces';
}\n`);
    }
  }
}

function fixDuplicateTypes() {
  for (const moduleInfo of moduleMap.values()) {
    const filePath = moduleInfo.name + '.ts';
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      for (const duplicateType of duplicateTypes) {
        const regex = new RegExp(`\\b${duplicateType}\\b`, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, `${duplicateType}_${moduleInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}`);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, content);
      }
    }
  }
}

function main() {
  console.log('Scanning source files...');
  scanSourceFiles(process.cwd());

  console.log('Generating missing module declarations...');
  generateModuleDeclarations();

  console.log('Fixing duplicate type declarations...');
  fixDuplicateTypes();

  console.log('Done!');
}

main(); 