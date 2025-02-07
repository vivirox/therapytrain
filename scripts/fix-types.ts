#!/usr/bin/env tsx

import { Project, SyntaxKind, Node, SourceFile } from 'ts-morph';
import path from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';
import { Command } from 'commander';
import * as fs from 'fs';

const project = new Project({
  tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
});

interface TypeFixError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: string;
  suggestion?: string;
  severity: 'error' | 'warning' | 'info';
  category: 'syntax' | 'type' | 'import' | 'export' | 'other';
}

interface TypeFixResult {
  file: string;
  errors: TypeFixError[];
  fixes: number;
  skipped: number;
}

interface TypeValidationError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: string;
  expected: string;
  actual: string;
  severity: 'error' | 'warning';
  category: 'type' | 'import' | 'circular' | 'unused' | 'other';
}

interface TypeValidationResult {
  file: string;
  errors: TypeValidationError[];
  warnings: number;
  circularDependencies: string[];
  unusedExports: string[];
}

// Report and collect errors
function reportError(error: TypeFixError): void {
  const severity = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }[error.severity];

  console.error(
    `${severity} ${error.file}:${error.line}:${error.column} - ${error.message} [${error.code}]` +
    (error.suggestion ? `\n   Suggestion: ${error.suggestion}` : '')
  );
}

// Collect errors during type fixes
const results: TypeFixResult[] = [];

// Helper function to add error to results
function addError(result: TypeFixResult, error: TypeFixError): void {
  result.errors.push(error);
  reportError(error);
}

// Helper function to create new result
function createResult(file: string): TypeFixResult {
  return {
    file,
    errors: [],
    fixes: 0,
    skipped: 0
  };
}

// Fix path alias issues
function fixPathAliases() {
  const sourceFiles = project.getSourceFiles();
  let totalFixes = 0;
  let totalSkipped = 0;

  sourceFiles.forEach(sourceFile => {
    const result = createResult(sourceFile.getFilePath());

    try {
      const imports = sourceFile.getImportDeclarations();
      imports.forEach(importDecl => {
        try {
          const moduleSpecifier = importDecl.getModuleSpecifierValue();
          if (moduleSpecifier.startsWith('../')) {
            // Convert relative paths to @/ paths
            const newPath = moduleSpecifier.replace(/^\.\.\//, '@/');
            importDecl.setModuleSpecifier(newPath);
            result.fixes++;
            totalFixes++;
          }
        } catch (error) {
          reportError({
            file: sourceFile.getFilePath(),
            line: importDecl.getStartLineNumber(),
            column: importDecl.getStart(),
            message: `Failed to fix path alias: ${error instanceof Error ? error.message : 'Unknown error'}`,
            code: 'PATH_ALIAS_FIX_FAILED',
            severity: 'error',
            category: 'import',
            suggestion: 'Try manually updating the import path'
          });
          result.skipped++;
          totalSkipped++;
        }
      });
    } catch (error) {
      reportError({
        file: sourceFile.getFilePath(),
        line: 1,
        column: 1,
        message: `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'FILE_PROCESSING_FAILED',
        severity: 'error',
        category: 'other'
      });
    }
  });

  console.log(`Fixed ${totalFixes} path aliases, skipped ${totalSkipped}`);
  project.saveSync();
}

// Fix component prop types
function fixComponentPropTypes() {
  const sourceFiles = project.getSourceFiles('src/**/*.tsx');
  let totalFixes = 0;

  sourceFiles.forEach(sourceFile => {
    const interfaces = sourceFile.getInterfaces();
    interfaces.forEach(interfaceDecl => {
      if (interfaceDecl.getName()?.endsWith('Props')) {
        const hasClassName = interfaceDecl.getProperties().some(prop => prop.getName() === 'className');
        if (!hasClassName) {
          interfaceDecl.addProperty({
            name: 'className',
            type: 'string',
            hasQuestionToken: true,
          });
          totalFixes++;
        }
      }
    });
  });

  console.log(`Added className to ${totalFixes} component prop interfaces`);
  project.saveSync();
}

// Fix unknown types
function fixUnknownTypes() {
  const sourceFiles = project.getSourceFiles();
  let totalFixes = 0;

  sourceFiles.forEach(sourceFile => {
    const typeRefs = sourceFile.getDescendantsOfKind(SyntaxKind.TypeReference);
    typeRefs.forEach(typeRef => {
      if (typeRef.getText() === 'unknown') {
        typeRef.replaceWithText('any'); // Temporary fix to get things working
        totalFixes++;
      }
    });
  });

  console.log(`Fixed ${totalFixes} unknown types`);
  project.saveSync();
}

// Fix array map/filter/reduce callbacks
function fixArrayCallbacks() {
  const sourceFiles = project.getSourceFiles();
  let totalFixes = 0;

  sourceFiles.forEach(sourceFile => {
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    callExpressions.forEach(callExpr => {
      const propertyAccess = callExpr.getChildrenOfKind(SyntaxKind.PropertyAccessExpression)[0];
      if (propertyAccess) {
        const methodName = propertyAccess.getName();
        if (['map', 'filter', 'reduce', 'forEach'].includes(methodName)) {
          const args = callExpr.getArguments();
          if (args.length > 0) {
            const callback = args[0];
            if (Node.isArrowFunction(callback) || Node.isFunctionExpression(callback)) {
              const params = callback.getParameters();
              if (params.length > 0) {
                params.forEach(param => {
                  if (!param.getTypeNode()) {
                    param.setType('any');
                    totalFixes++;
                  }
                });
              }
            }
          }
        }
      }
    });
  });

  console.log(`Fixed ${totalFixes} array callback parameter types`);
  project.saveSync();
}

// Fix React component types
function fixReactComponentTypes() {
  const sourceFiles = project.getSourceFiles('src/**/*.tsx');
  let totalFixes = 0;

  sourceFiles.forEach(sourceFile => {
    const functions = sourceFile.getFunctions();
    functions.forEach(func => {
      const name = func.getName();
      if (name && /^[A-Z]/.test(name)) { // Component names start with uppercase
        const returnType = func.getReturnTypeNode();
        if (!returnType) {
          func.setReturnType('JSX.Element');
          totalFixes++;
        }
      }
    });

    const arrowFunctions = sourceFile.getVariableDeclarations();
    arrowFunctions.forEach(varDecl => {
      const name = varDecl.getName();
      if (name && /^[A-Z]/.test(name)) {
        const initializer = varDecl.getInitializer();
        if (Node.isArrowFunction(initializer)) {
          if (!varDecl.getTypeNode()) {
            varDecl.setType('React.FC');
            totalFixes++;
          }
        }
      }
    });
  });

  console.log(`Fixed ${totalFixes} React component types`);
  project.saveSync();
}

// Fix event handler types
function fixEventHandlerTypes() {
  const sourceFiles = project.getSourceFiles('src/**/*.tsx');
  sourceFiles.forEach(sourceFile => {
    const functions = sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration);
    functions.forEach(func => {
      const name = func.getName();
      if (name?.toLowerCase().includes('handle') || name?.toLowerCase().includes('on')) {
        func.getParameters().forEach(param => {
          if (!param.getTypeNode()) {
            const paramName = param.getName().toLowerCase();
            if (paramName.includes('event') || paramName === 'e') {
              param.setType('React.SyntheticEvent');
            }
          }
        });
      }
    });
  });
}

// Fix Supabase client types
function fixSupabaseTypes() {
  const sourceFiles = project.getSourceFiles();
  sourceFiles.forEach(sourceFile => {
    // Fix Supabase client imports
    const imports = sourceFile.getImportDeclarations();
    imports.forEach(importDecl => {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      if (moduleSpecifier === '@supabase/supabase-js') {
        // Ensure proper types are imported
        const namedImports = importDecl.getNamedImports();
        const hasClient = namedImports.some(imp => imp.getName() === 'SupabaseClient');
        const hasUser = namedImports.some(imp => imp.getName() === 'User');
        
        if (!hasClient || !hasUser) {
          importDecl.addNamedImports([
            { name: 'SupabaseClient' },
            { name: 'User' },
            { name: 'Session' }
          ].filter(imp => !namedImports.some(existing => existing.getName() === imp.name)));
        }
      }
    });

    // Fix Supabase client instance types
    const variables = sourceFile.getVariableDeclarations();
    variables.forEach(variable => {
      if (variable.getType().getText().includes('Supabase')) {
        if (!variable.getTypeNode()) {
          variable.setType('SupabaseClient<Database>');
        }
      }
    });

    // Fix auth related types
    const functions = sourceFile.getFunctions();
    functions.forEach(func => {
      const params = func.getParameters();
      params.forEach(param => {
        const type = param.getType().getText();
        if (type.includes('unknown') && param.getName().toLowerCase().includes('user')) {
          param.setType('User');
        }
        if (type.includes('unknown') && param.getName().toLowerCase().includes('session')) {
          param.setType('Session');
        }
      });
    });

    // Fix database types
    const typeAliases = sourceFile.getTypeAliases();
    typeAliases.forEach(typeAlias => {
      const name = typeAlias.getName();
      if (name.includes('Database') || name.includes('Tables')) {
        // Ensure Database type is properly imported
        const hasImport = sourceFiles.some(sf => 
          sf.getImportDeclarations().some(imp => 
            imp.getModuleSpecifierValue() === '../types/supabase' &&
            imp.getNamedImports().some(named => named.getName() === 'Database')
          )
        );
        
        if (!hasImport) {
          sourceFile.addImportDeclaration({
            moduleSpecifier: '../types/supabase',
            namedImports: [{ name: 'Database' }]
          });
        }
      }
    });
  });
}

// Fix Express middleware and route types
function fixExpressTypes() {
  const sourceFiles = project.getSourceFiles();
  sourceFiles.forEach(sourceFile => {
    // Fix Express imports
    const imports = sourceFile.getImportDeclarations();
    imports.forEach(importDecl => {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      if (moduleSpecifier === 'express') {
        // Ensure proper types are imported
        const namedImports = importDecl.getNamedImports();
        const hasRequest = namedImports.some(imp => imp.getName() === 'Request');
        const hasResponse = namedImports.some(imp => imp.getName() === 'Response');
        const hasNextFunction = namedImports.some(imp => imp.getName() === 'NextFunction');
        
        if (!hasRequest || !hasResponse || !hasNextFunction) {
          importDecl.addNamedImports([
            { name: 'Request' },
            { name: 'Response' },
            { name: 'NextFunction' }
          ].filter(imp => !namedImports.some(existing => existing.getName() === imp.name)));
        }
      }
    });

    // Fix middleware function types
    const functions = sourceFile.getFunctions();
    functions.forEach(func => {
      const params = func.getParameters();
      if (params.length >= 3 && 
          (params[0].getType().getText().includes('Request') || 
           params[0].getName() === 'req') &&
          (params[1].getType().getText().includes('Response') || 
           params[1].getName() === 'res')) {
        // This looks like a middleware function
        params.forEach((param, index) => {
          if (!param.getTypeNode()) {
            switch (index) {
              case 0:
                param.setType('Request');
                break;
              case 1:
                param.setType('Response');
                break;
              case 2:
                param.setType('NextFunction');
                break;
            }
          }
        });

        // Fix return type if not set
        if (!func.getReturnTypeNode()) {
          func.setReturnType('void | Promise<void>');
        }
      }
    });

    // Fix error handler middleware
    const errorHandlers = functions.filter(func => {
      const params = func.getParameters();
      return params.length === 4 && 
             params[0].getName().toLowerCase().includes('err') &&
             params[1].getType().getText().includes('Request');
    });

    errorHandlers.forEach(handler => {
      const params = handler.getParameters();
      params.forEach((param, index) => {
        if (!param.getTypeNode()) {
          switch (index) {
            case 0:
              param.setType('Error');
              break;
            case 1:
              param.setType('Request');
              break;
            case 2:
              param.setType('Response');
              break;
            case 3:
              param.setType('NextFunction');
              break;
          }
        }
      });

      // Fix return type if not set
      if (!handler.getReturnTypeNode()) {
        handler.setReturnType('void');
      }
    });

    // Fix route handler types
    const routeHandlers = sourceFile.getVariableDeclarations().filter(v => 
      v.getType().getText().includes('RequestHandler')
    );

    routeHandlers.forEach(handler => {
      if (!handler.getTypeNode()) {
        handler.setType('RequestHandler');
      }
    });

    // Fix router declarations
    const routerVars = sourceFile.getVariableDeclarations().filter(v => 
      v.getInitializer()?.getText().includes('express.Router()')
    );

    routerVars.forEach(router => {
      if (!router.getTypeNode()) {
        router.setType('Router');
        
        // Ensure Router is imported
        const hasRouterImport = imports.some(imp => 
          imp.getModuleSpecifierValue() === 'express' &&
          imp.getNamedImports().some(named => named.getName() === 'Router')
        );
        
        if (!hasRouterImport) {
          sourceFile.addImportDeclaration({
            moduleSpecifier: 'express',
            namedImports: [{ name: 'Router' }]
          });
        }
      }
    });
  });
}

// Fix WebAuthn types
function fixWebAuthnTypes() {
  const sourceFiles = project.getSourceFiles();
  sourceFiles.forEach(sourceFile => {
    // Fix WebAuthn imports
    const imports = sourceFile.getImportDeclarations();
    imports.forEach(importDecl => {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      if (moduleSpecifier === '@simplewebauthn/server') {
        // Ensure proper types are imported
        const namedImports = importDecl.getNamedImports();
        const requiredTypes = [
          'generateRegistrationOptions',
          'verifyRegistrationResponse',
          'generateAuthenticationOptions',
          'verifyAuthenticationResponse',
          'VerifiedRegistrationResponse',
          'VerifiedAuthenticationResponse'
        ];
        
        const missingTypes = requiredTypes.filter(type => 
          !namedImports.some(imp => imp.getName() === type)
        );
        
        if (missingTypes.length > 0) {
          importDecl.addNamedImports(
            missingTypes.map(name => ({ name }))
          );
        }
      }
    });

    // Fix WebAuthn service types
    const classes = sourceFile.getClasses();
    classes.forEach(cls => {
      if (cls.getName()?.includes('WebAuthn')) {
        // Fix method return types
        const methods = cls.getMethods();
        methods.forEach(method => {
          const name = method.getName();
          if (!method.getReturnTypeNode()) {
            if (name.includes('generate')) {
              if (name.includes('Registration')) {
                method.setReturnType('Promise<PublicKeyCredentialCreationOptionsJSON>');
              } else if (name.includes('Authentication')) {
                method.setReturnType('Promise<PublicKeyCredentialRequestOptionsJSON>');
              }
            } else if (name.includes('verify')) {
              if (name.includes('Registration')) {
                method.setReturnType('Promise<VerifiedRegistrationResponse>');
              } else if (name.includes('Authentication')) {
                method.setReturnType('Promise<VerifiedAuthenticationResponse>');
              }
            }
          }
        });

        // Fix method parameter types
        methods.forEach(method => {
          const params = method.getParameters();
          params.forEach(param => {
            const name = param.getName().toLowerCase();
            if (!param.getTypeNode()) {
              if (name.includes('options')) {
                if (method.getName().includes('Registration')) {
                  param.setType('PublicKeyCredentialCreationOptionsJSON');
                } else if (method.getName().includes('Authentication')) {
                  param.setType('PublicKeyCredentialRequestOptionsJSON');
                }
              } else if (name.includes('response')) {
                if (method.getName().includes('Registration')) {
                  param.setType('RegistrationCredentialJSON');
                } else if (method.getName().includes('Authentication')) {
                  param.setType('AuthenticationCredentialJSON');
                }
              }
            }
          });
        });
      }
    });

    // Fix WebAuthn request/response types
    const interfaces = sourceFile.getInterfaces();
    interfaces.forEach(iface => {
      const name = iface.getName();
      if (name?.includes('WebAuthn')) {
        // Add proper imports if needed
        const hasClientTypes = imports.some(imp => 
          imp.getModuleSpecifierValue() === '@simplewebauthn/browser'
        );
        
        if (!hasClientTypes) {
          sourceFile.addImportDeclaration({
            moduleSpecifier: '@simplewebauthn/browser',
            namedImports: [
              { name: 'PublicKeyCredentialCreationOptionsJSON' },
              { name: 'PublicKeyCredentialRequestOptionsJSON' },
              { name: 'RegistrationCredentialJSON' },
              { name: 'AuthenticationCredentialJSON' }
            ]
          });
        }

        // Fix interface properties
        const properties = iface.getProperties();
        properties.forEach(prop => {
          if (!prop.getTypeNode()) {
            const name = prop.getName().toLowerCase();
            if (name.includes('options')) {
              if (iface.getName()?.includes('Register')) {
                prop.setType('PublicKeyCredentialCreationOptionsJSON');
              } else if (iface.getName()?.includes('Verify')) {
                prop.setType('PublicKeyCredentialRequestOptionsJSON');
              }
            } else if (name.includes('response')) {
              if (iface.getName()?.includes('Register')) {
                prop.setType('RegistrationCredentialJSON');
              } else if (iface.getName()?.includes('Verify')) {
                prop.setType('AuthenticationCredentialJSON');
              }
            }
          }
        });
      }
    });
  });
}

// Fix BAA Management types
function fixBAATypes() {
  const sourceFiles = project.getSourceFiles();
  sourceFiles.forEach(sourceFile => {
    // Fix enum exports
    const enums = sourceFile.getEnums();
    const baaEnums = enums.filter(e => 
      ['BAType', 'BAStatus', 'BAAStatus', 'BAADocumentType', 'DataAccessType', 'SecurityCategory', 'SignatureType']
        .includes(e.getName() || '')
    );
    
    baaEnums.forEach(e => {
      if (!e.isExported()) {
        e.setIsExported(true);
      }
    });

    // Fix interface exports
    const interfaces = sourceFile.getInterfaces();
    const baaInterfaces = interfaces.filter(i => 
      ['BusinessAssociate', 'BAA', 'BAADocument', 'BAASignature', 'BAAAmendment', 'DataHandlingRequirement', 
       'SecurityRequirement', 'BreachNotificationRequirement', 'TerminationRequirement']
        .includes(i.getName() || '')
    );
    
    baaInterfaces.forEach(i => {
      if (!i.isExported()) {
        i.setIsExported(true);
      }
    });

    // Fix timestamp properties
    baaInterfaces.forEach(i => {
      const dateProperties = i.getProperties().filter(p => 
        p.getType().getText().includes('Date') ||
        p.getName().toLowerCase().includes('date') ||
        p.getName().toLowerCase().includes('at')
      );

      dateProperties.forEach(p => {
        if (p.getTypeNode()?.getText() === 'Date') {
          // Keep as Date for class properties
          return;
        }
        // For interface properties, use string for better serialization
        p.setType('string');
      });
    });

    // Fix metadata types
    baaInterfaces.forEach(i => {
      const metadataProps = i.getProperties().filter(p => p.getName() === 'metadata');
      metadataProps.forEach(p => {
        if (p.getTypeNode()?.getText() === 'Record<string, any>') {
          p.setType('Record<string, unknown>');
        }
      });
    });

    // Fix service method types
    const classes = sourceFile.getClasses();
    classes.forEach(cls => {
      if (cls.getName() === 'BAAManagementService') {
        // Fix constructor parameter types
        const constructor = cls.getConstructors()[0];
        if (constructor) {
          const params = constructor.getParameters();
          params.forEach(param => {
            if (!param.getTypeNode()) {
              const name = param.getName();
              if (name.includes('security')) {
                param.setType('SecurityAuditService');
              } else if (name.includes('hipaa')) {
                param.setType('HIPAACompliantAuditService');
              } else if (name.includes('path')) {
                param.setType('string');
              }
            }
          });
        }

        // Fix method parameter and return types
        const methods = cls.getMethods();
        methods.forEach(method => {
          const name = method.getName();
          const params = method.getParameters();

          // Fix parameter types
          params.forEach(param => {
            if (!param.getTypeNode()) {
              const paramName = param.getName().toLowerCase();
              if (paramName.includes('id')) {
                param.setType('string');
              } else if (paramName.includes('data')) {
                if (name.includes('BusinessAssociate')) {
                  param.setType('Omit<BusinessAssociate, "id" | "createdAt" | "updatedAt">');
                } else if (name.includes('BAA')) {
                  param.setType('Omit<BAA, "id" | "businessAssociateId" | "createdAt" | "updatedAt">');
                }
              } else if (paramName.includes('document')) {
                param.setType('Omit<BAADocument, "id" | "hash" | "uploadedAt">');
              } else if (paramName.includes('signature')) {
                param.setType('Omit<BAASignature, "id">');
              } else if (paramName.includes('amendment')) {
                param.setType('Omit<BAAAmendment, "id" | "createdAt">');
              } else if (paramName.includes('date')) {
                param.setType('Date');
              }
            }
          });

          // Fix return types
          if (!method.getReturnTypeNode()) {
            if (name.includes('create')) {
              if (name.includes('BusinessAssociate')) {
                method.setReturnType('Promise<BusinessAssociate>');
              } else if (name.includes('BAA')) {
                method.setReturnType('Promise<BAA>');
              }
            } else if (name.includes('upload')) {
              method.setReturnType('Promise<BAADocument>');
            } else if (name.includes('add') && name.includes('Signature')) {
              method.setReturnType('Promise<BAASignature>');
            } else if (name.includes('add') && name.includes('Amendment')) {
              method.setReturnType('Promise<BAAAmendment>');
            } else if (name.includes('terminate') || name.includes('verify') || name.includes('initialize')) {
              method.setReturnType('Promise<void>');
            }
          }
        });
      }
    });
  });
}

// Function to fix common TypeScript issues
function fixTypeIssues(content: string): string {
  // Fix array callback parameter syntax
  content = content.replace(/\.map\((\w+),\s*unknown(?:,\s*unknown)?\s*=>/g, '.map(($1) =>');
  content = content.replace(/\.filter\((\w+),\s*unknown(?:,\s*unknown)?\s*=>/g, '.filter(($1) =>');
  content = content.replace(/\.forEach\((\w+),\s*unknown(?:,\s*unknown)?\s*=>/g, '.forEach(($1) =>');
  content = content.replace(/\.flatMap\((\w+),\s*unknown(?:,\s*unknown)?\s*=>/g, '.flatMap(($1) =>');
  content = content.replace(/\.reduce\((\w+),\s*unknown(?:,\s*unknown)?\s*=>/g, '.reduce(($1) =>');

  // Fix catch error parameter
  content = content.replace(/\.catch\((\w+),\s*unknown(?:,\s*unknown)?\s*=>/g, '.catch(($1: Error) =>');

  // Fix event listener options
  content = content.replace(
    /getEventListenerOptions\(wantsPassive\)/g,
    'wantsPassive ? { passive: true } : false'
  );

  // Fix unknown type assertions in array operations
  content = content.replace(
    /(sum|a|b): unknown/g,
    '$1: number'
  );

  return content;
}

// Validate types after fixes
function validateTypes(): TypeValidationResult[] {
  const validationResults: TypeValidationResult[] = [];
  const sourceFiles = project.getSourceFiles();

  sourceFiles.forEach(sourceFile => {
    const result: TypeValidationResult = {
      file: sourceFile.getFilePath(),
      errors: [],
      warnings: 0,
      circularDependencies: [],
      unusedExports: []
    };

    // Check for type errors
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    diagnostics.forEach(diagnostic => {
      const { line, column } = sourceFile.getLineAndColumnAtPos(diagnostic.getStart());
      result.errors.push({
        file: sourceFile.getFilePath(),
        line,
        column,
        message: diagnostic.getMessageText().toString(),
        code: diagnostic.getCode().toString(),
        expected: 'unknown', // TypeScript doesn't always provide this
        actual: 'unknown', // TypeScript doesn't always provide this
        severity: diagnostic.getCategory() === 1 ? 'warning' : 'error',
        category: 'type'
      });
    });

    // Check for circular dependencies
    const imports = sourceFile.getImportDeclarations();
    const dependencies = new Set<string>();
    imports.forEach(imp => {
      const moduleSpecifier = imp.getModuleSpecifierValue();
      dependencies.add(moduleSpecifier);
    });

    function findCircularDependencies(module: string, visited: Set<string>, path: string[]): void {
      if (visited.has(module)) {
        const cycle = path.slice(path.indexOf(module));
        result.circularDependencies.push(cycle.join(' -> ') + ' -> ' + module);
        return;
      }

      visited.add(module);
      path.push(module);

      const moduleFile = project.getSourceFile(module + '.ts') || 
                        project.getSourceFile(module + '.tsx');
      if (moduleFile) {
        moduleFile.getImportDeclarations().forEach(imp => {
          const nextModule = imp.getModuleSpecifierValue();
          findCircularDependencies(nextModule, new Set(visited), [...path]);
        });
      }

      path.pop();
      visited.delete(module);
    }

    dependencies.forEach(dep => {
      findCircularDependencies(dep, new Set(), []);
    });

    // Check for unused exports
    const exports = sourceFile.getExportedDeclarations();
    exports.forEach((declarations, name) => {
      let isUsed = false;
      project.getSourceFiles().forEach(sf => {
        if (sf !== sourceFile) {
          sf.getImportDeclarations().forEach(imp => {
            const namedImports = imp.getNamedImports();
            if (namedImports.some(ni => ni.getName() === name)) {
              isUsed = true;
            }
          });
        }
      });

      if (!isUsed) {
        result.unusedExports.push(name);
      }
    });

    // Add warnings for type assertions
    const typeAssertions = sourceFile.getDescendantsOfKind(SyntaxKind.TypeAssertionExpression);
    typeAssertions.forEach(assertion => {
      result.warnings++;
      result.errors.push({
        file: sourceFile.getFilePath(),
        line: sourceFile.getLineAndColumnAtPos(assertion.getStart()).line,
        column: sourceFile.getLineAndColumnAtPos(assertion.getStart()).column,
        message: 'Type assertion found - consider using type guards instead',
        code: 'TYPE_ASSERTION_USAGE',
        expected: assertion.getType().getText(),
        actual: assertion.getExpression().getType().getText(),
        severity: 'warning',
        category: 'type'
      });
    });

    validationResults.push(result);
  });

  return validationResults;
}

// Fix missing type declarations
function fixMissingTypeDeclarations() {
  const sourceFiles = project.getSourceFiles();
  let totalFixes = 0;

  sourceFiles.forEach(sourceFile => {
    const result = createResult(sourceFile.getFilePath());

    // Add missing Database type
    if (sourceFile.getImportDeclaration('@supabase/supabase-js')) {
      const hasDatabase = sourceFile.getInterface('Database');
      if (!hasDatabase) {
        sourceFile.addInterface({
          name: 'Database',
          isExported: true,
          properties: [
            {
              name: 'public',
              type: '{ Tables: { [key: string]: any } }',
            },
          ],
        });
        totalFixes++;
      }
    }

    // Add missing ToastState type
    if (sourceFile.getFilePath().includes('use-toast.ts')) {
      const hasToastState = sourceFile.getInterface('ToastState');
      if (!hasToastState) {
        sourceFile.addInterface({
          name: 'ToastState',
          isExported: true,
          properties: [
            {
              name: 'toasts',
              type: 'Toast[]',
            },
          ],
        });
        totalFixes++;
      }
    }

    // Add missing ClientProfile type
    if (sourceFile.getFilePath().includes('ClientProfile.ts')) {
      const hasClientProfile = sourceFile.getInterface('ClientProfile');
      if (!hasClientProfile) {
        sourceFile.addInterface({
          name: 'ClientProfile',
          isExported: true,
          properties: [
            {
              name: 'id',
              type: 'string',
            },
            {
              name: 'name',
              type: 'string',
            },
            {
              name: 'primary_issue',
              type: 'string',
            },
            // Add other properties as needed
          ],
        });
        totalFixes++;
      }
    }
  });

  console.log(`Added ${totalFixes} missing type declarations`);
  project.saveSync();
}

// Fix interface extension issues
function fixInterfaceExtensions() {
  const sourceFiles = project.getSourceFiles();
  let totalFixes = 0;

  sourceFiles.forEach(sourceFile => {
    const interfaces = sourceFile.getInterfaces();
    interfaces.forEach(interfaceDecl => {
      const heritage = interfaceDecl.getHeritageClauses();
      heritage.forEach(clause => {
        const types = clause.getTypeNodes();
        types.forEach(type => {
          const name = type.getText();
          if (name === 'BaseProps') {
            // Fix OTPProps
            if (interfaceDecl.getName() === 'OTPProps') {
              const onChangeProp = interfaceDecl.getProperty('onChange');
              if (onChangeProp) {
                onChangeProp.setType('(value: string) => void');
                totalFixes++;
              }
            }
            // Fix PositionProps
            if (interfaceDecl.getName() === 'PositionProps') {
              const contentProp = interfaceDecl.getProperty('content');
              if (contentProp) {
                contentProp.setType('string | ReactNode');
                totalFixes++;
              }
            }
          }
        });
      });
    });
  });

  console.log(`Fixed ${totalFixes} interface extension issues`);
  project.saveSync();
}

// Main function to run all fixes
function main() {
  console.log('Starting type fixes...');
  
  fixPathAliases();
  fixComponentPropTypes();
  fixUnknownTypes();
  fixArrayCallbacks();
  fixReactComponentTypes();
  fixEventHandlerTypes();
  fixMissingTypeDeclarations();
  fixInterfaceExtensions();
  
  console.log('Type fixes completed.');
}

main();

// Set up command line interface
const program = new Command();

program
  .name('fix-types')
  .description('Fix TypeScript type issues')
  .version('1.0.0');

program
  .option('-p, --paths', 'Fix path aliases')
  .option('-c, --components', 'Fix component prop types')
  .option('-u, --unknown', 'Fix unknown types')
  .option('-a, --arrays', 'Fix array callback types')
  .option('-r, --react', 'Fix React component types')
  .option('-A, --all', 'Fix all type issues');

program.parse(process.argv);

const options = program.opts();

if (options.all || Object.keys(options).length === 0) {
  console.log('Fixing all type issues...');
  fixPathAliases();
  fixComponentPropTypes();
  fixUnknownTypes();
  fixArrayCallbacks();
  fixReactComponentTypes();
} else {
  if (options.paths) {
    console.log('Fixing path aliases...');
    fixPathAliases();
  }
  if (options.components) {
    console.log('Fixing component prop types...');
    fixComponentPropTypes();
  }
  if (options.unknown) {
    console.log('Fixing unknown types...');
    fixUnknownTypes();
  }
  if (options.arrays) {
    console.log('Fixing array callback types...');
    fixArrayCallbacks();
  }
  if (options.react) {
    console.log('Fixing React component types...');
    fixReactComponentTypes();
  }
}

// Path mappings from tsconfig.json
const pathMappings = {
  '@/*': ['src/*'],
  '@components/*': ['src/components/*'],
  '@lib/*': ['src/lib/*'],
  '@hooks/*': ['src/hooks/*'],
  '@contexts/*': ['src/contexts/*'],
  '@services/*': ['src/services/*'],
  '@types/*': ['src/types/*'],
  '@utils/*': ['src/utils/*'],
  '@backend/*': ['backend/src/*']
};

// Fix import paths in a file
function fixImportPaths(filePath: string): void {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix relative imports to use path aliases
  content = content.replace(
    /from ['"]\.\.?\/?(.+?)['"]/g,
    (match, importPath) => {
      const relativePath = path.relative(path.dirname(filePath), 'src');
      return `from '@/${importPath}'`;
    }
  );

  // Fix incorrect path aliases
  content = content.replace(
    /from ['"]@\/\.\.\/(.+?)['"]/g,
    (match, importPath) => `from '@/${importPath}'`
  );

  // Fix case sensitivity in imports
  content = content.replace(
    /from ['"](.+?)['"]/g,
    (match, importPath) => {
      if (importPath.includes('/')) {
        const parts = importPath.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart.toLowerCase() !== lastPart) {
          parts[parts.length - 1] = lastPart.toLowerCase();
          return `from '${parts.join('/')}'`;
        }
      }
      return match;
    }
  );

  if (content !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed imports in ${filePath}`);
  }
}

// Find all TypeScript files
const files = glob.sync('src/**/*.{ts,tsx}');
files.forEach(fixImportPaths);

console.log('Import paths fixed successfully!');
