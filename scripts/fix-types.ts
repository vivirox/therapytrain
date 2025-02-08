import { Project } from 'ts-morph';
import path from 'path';
import fs from 'fs';

const project = new Project({
  tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
});

// Fix module resolution issues
function fixModuleResolution() {
  const sourceFiles = project.getSourceFiles();
  
  sourceFiles.forEach(sourceFile => {
    // Fix import declarations
    sourceFile.getImportDeclarations().forEach(importDecl => {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      
      // Fix case sensitivity issues
      if (moduleSpecifier.startsWith('@/')) {
        const normalizedPath = moduleSpecifier.replace('@/', 'src/');
        const absolutePath = path.join(process.cwd(), normalizedPath);
        
        // Check if file exists with different casing
        const dir = path.dirname(absolutePath);
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          const matchingFile = files.find(f => 
            f.toLowerCase() === path.basename(normalizedPath).toLowerCase()
          );
          
          if (matchingFile) {
            const correctPath = moduleSpecifier.replace(
              path.basename(moduleSpecifier),
              matchingFile
            );
            importDecl.setModuleSpecifier(correctPath);
          }
        }
      }
    });
  });
}

// Fix type definition issues
function fixTypeDefinitions() {
  const sourceFiles = project.getSourceFiles();
  
  sourceFiles.forEach(sourceFile => {
    // Fix interface conflicts
    sourceFile.getInterfaces().forEach(interfaceDecl => {
      const heritage = interfaceDecl.getHeritageClauses();
      
      // Fix extends clauses
      heritage.forEach(clause => {
        const types = clause.getTypeNodes();
        types.forEach(type => {
          const typeText = type.getText();
          
          // Fix BaseProps extends
          if (typeText.includes('BaseProps')) {
            const properties = interfaceDecl.getProperties();
            const hasContent = properties.some(p => p.getName() === 'content');
            
            if (!hasContent) {
              interfaceDecl.addProperty({
                name: 'content',
                type: 'string | undefined',
              });
            }
          }
        });
      });
    });
  });
}

// Fix import/export issues
function fixImportExports() {
  const sourceFiles = project.getSourceFiles();
  
  sourceFiles.forEach(sourceFile => {
    // Remove unused imports
    sourceFile.getImportDeclarations().forEach(importDecl => {
      const namedImports = importDecl.getNamedImports();
      const unusedImports = namedImports.filter(namedImport => {
        const identifier = namedImport.getNameNode();
        const refs = identifier.findReferencesAsNodes();
        return refs.length <= 1; // One reference is the import itself
      });
      
      // Remove unused named imports
      unusedImports.forEach(imp => imp.remove());
      
      // Remove empty import declarations
      if (importDecl.getNamedImports().length === 0) {
        importDecl.remove();
      }
    });
    
    // Fix missing exports
    sourceFile.getExportDeclarations().forEach(exportDecl => {
      const moduleSpecifier = exportDecl.getModuleSpecifier()?.getLiteralValue();
      if (moduleSpecifier?.startsWith('@/')) {
        const normalizedPath = moduleSpecifier.replace('@/', 'src/');
        const absolutePath = path.join(process.cwd(), normalizedPath);
        
        if (!fs.existsSync(absolutePath) && !fs.existsSync(absolutePath + '.ts')) {
          console.log(`Warning: Missing export target ${moduleSpecifier} in ${sourceFile.getFilePath()}`);
        }
      }
    });
  });
}

// Main function to run all fixes
async function main() {
  console.log('Fixing TypeScript issues...');
  
  try {
    // Run fixes
    fixModuleResolution();
    fixTypeDefinitions();
    fixImportExports();
    
    // Save changes
    const diagnostics = project.getPreEmitDiagnostics();
    
    if (diagnostics.length) {
      console.log('Remaining TypeScript issues:');
      console.log(project.formatDiagnosticsWithColorAndContext(diagnostics));
    } else {
      console.log('All TypeScript issues fixed!');
    }
    
    await project.save();
  } catch (error) {
    console.error('Error fixing TypeScript issues:', error);
  }
}

main().catch(console.error);
