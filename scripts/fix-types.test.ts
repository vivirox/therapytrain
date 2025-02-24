import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

describe('Type Fixes', () => {
  let project: Project;
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = path.join(os.tmpdir(), 'type-fixes-test-' + Math.random().toString(36).slice(2));
    await fs.mkdir(tempDir, { recursive: true });

    // Initialize project
    project = new Project({
      tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true
    });
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Path Alias Fixes', () => {
    it('should fix path aliases correctly', async () => {
      // Create test file
      const sourceFile = project.createSourceFile(
        path.join(tempDir, 'test.ts'),
        `import { Something } from '@/components/Something';`
      );

      // Run fix
      fixPathAliases();

      // Verify fix
      expect(sourceFile.getFullText()).toContain(`import { Something } from '../components/Something'`);
    });
  });

  describe('Component Prop Type Fixes', () => {
    it('should add missing className prop to component interfaces', async () => {
      // Create test file
      const sourceFile = project.createSourceFile(
        path.join(tempDir, 'Button.tsx'),
        `interface ButtonProps {
          label: string;
        }`
      );

      // Run fix
      fixComponentPropTypes();

      // Verify fix
      const props = sourceFile.getInterface('ButtonProps');
      expect(props?.getProperty('className')).toBeDefined();
      expect(props?.getProperty('className')?.getType().getText()).toBe('string');
      expect(props?.getProperty('className')?.hasQuestionToken()).toBe(true);
    });
  });

  describe('Unknown Type Fixes', () => {
    it('should fix unknown types to any', async () => {
      // Create test file
      const sourceFile = project.createSourceFile(
        path.join(tempDir, 'test.ts'),
        `let x: unknown;`
      );

      // Run fix
      fixUnknownTypes();

      // Verify fix
      expect(sourceFile.getFullText()).toContain('let x: any;');
    });
  });

  describe('Array Callback Fixes', () => {
    it('should fix array callback parameter types', async () => {
      // Create test file
      const sourceFile = project.createSourceFile(
        path.join(tempDir, 'test.ts'),
        `const numbers = [1, 2, 3];
        numbers.map(num => num * 2);`
      );

      // Run fix
      fixArrayCallbacks();

      // Verify fix
      const callback = sourceFile
        .getDescendantsOfKind(SyntaxKind.ArrowFunction)[0]
        .getParameters()[0];
      expect(callback.getType().getText()).toBe('any');
    });
  });

  describe('Express Type Fixes', () => {
    it('should fix Express middleware types', async () => {
      // Create test file
      const sourceFile = project.createSourceFile(
        path.join(tempDir, 'middleware.ts'),
        `import express from 'express';
        function authMiddleware(req, res, next) {
          // Middleware logic
        }`
      );

      // Run fix
      fixExpressTypes();

      // Verify fix
      const middleware = sourceFile.getFunction('authMiddleware');
      const params = middleware?.getParameters();
      expect(params?.[0].getType().getText()).toBe('Request');
      expect(params?.[1].getType().getText()).toBe('Response');
      expect(params?.[2].getType().getText()).toBe('NextFunction');
    });
  });

  describe('WebAuthn Type Fixes', () => {
    it('should fix WebAuthn service types', async () => {
      // Create test file
      const sourceFile = project.createSourceFile(
        path.join(tempDir, 'WebAuthnService.ts'),
        `import { generateRegistrationOptions } from '@simplewebauthn/server';
        class WebAuthnService {
          async generateOptions() {
            // Generate options
          }
        }`
      );

      // Run fix
      fixWebAuthnTypes();

      // Verify fix
      const method = sourceFile
        .getClass('WebAuthnService')
        ?.getMethod('generateOptions');
      expect(method?.getReturnType().getText())
        .toBe('Promise<PublicKeyCredentialCreationOptionsJSON>');
    });
  });

  describe('BAA Management Type Fixes', () => {
    it('should fix BAA interface exports and types', async () => {
      // Create test file
      const sourceFile = project.createSourceFile(
        path.join(tempDir, 'BAATypes.ts'),
        `interface BAA {
          id: string;
          createdAt: Date;
          metadata: Record<string, any>;
        }`
      );

      // Run fix
      fixBAATypes();

      // Verify fixes
      const baa = sourceFile.getInterface('BAA');
      expect(baa?.isExported()).toBe(true);
      expect(baa?.getProperty('createdAt')?.getType().getText()).toBe('string');
      expect(baa?.getProperty('metadata')?.getType().getText())
        .toBe('Record<string, unknown>');
    });
  });

  describe('Type Validation', () => {
    it('should detect type errors', async () => {
      // Create test file with type error
      const sourceFile = project.createSourceFile(
        path.join(tempDir, 'test.ts'),
        `const x: number = 'string';`
      );

      // Run validation
      const results = validateTypes();

      // Verify validation
      const fileResult = results.find(r => r.file === sourceFile.getFilePath());
      expect(fileResult?.errors.length).toBeGreaterThan(0);
      expect(fileResult?.errors[0].category).toBe('type');
    });

    it('should detect circular dependencies', async () => {
      // Create test files with circular dependency
      project.createSourceFile(
        path.join(tempDir, 'a.ts'),
        `import { b } from './b';`
      );
      project.createSourceFile(
        path.join(tempDir, 'b.ts'),
        `import { a } from './a';`
      );

      // Run validation
      const results = validateTypes();

      // Verify validation
      const circularDeps = results.flatMap(r => r.circularDependencies);
      expect(circularDeps.length).toBeGreaterThan(0);
    });

    it('should detect unused exports', async () => {
      // Create test file with unused export
      const sourceFile = project.createSourceFile(
        path.join(tempDir, 'test.ts'),
        `export const unused = 'unused';`
      );

      // Run validation
      const results = validateTypes();

      // Verify validation
      const fileResult = results.find(r => r.file === sourceFile.getFilePath());
      expect(fileResult?.unusedExports).toContain('unused');
    });

    it('should detect type assertions', async () => {
      // Create test file with type assertion
      const sourceFile = project.createSourceFile(
        path.join(tempDir, 'test.ts'),
        `const x = 'string' as unknown as number;`
      );

      // Run validation
      const results = validateTypes();

      // Verify validation
      const fileResult = results.find(r => r.file === sourceFile.getFilePath());
      expect(fileResult?.warnings).toBeGreaterThan(0);
      expect(fileResult?.errors.some(e => e.code === 'TYPE_ASSERTION_USAGE')).toBe(true);
    });
  });
}); 