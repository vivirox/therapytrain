#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

interface CodeQualityConfig {
  version: string;
  tools: {
    [key: string]: {
      enabled: boolean;
      config: string;
      extensions?: string[];
      ignore?: string[];
      coverage?: {
        [key: string]: number;
      };
    };
  };
  metrics: {
    complexity: {
      cyclomatic: {
        max: number;
        warning: number;
      };
      cognitive: {
        max: number;
        warning: number;
      };
    };
    maintainability: {
      index: {
        min: number;
        warning: number;
      };
    };
    duplication: {
      threshold: number;
      minLines: number;
      minTokens: number;
    };
  };
  rules: {
    naming: {
      [key: string]: string;
    };
    imports: {
      order: string[];
      newlines: boolean;
    };
    testing: {
      coverage: {
        required: boolean;
        threshold: number;
      };
      e2e: {
        required: boolean;
        critical: string[];
      };
    };
    documentation: {
      [key: string]: {
        required: boolean;
        [key: string]: boolean;
      };
    };
    security: {
      audit: {
        required: boolean;
        frequency: string;
      };
      dependencies: {
        scan: boolean;
        update: string;
      };
    };
  };
  ci: {
    checks: string[];
    autofix: {
      enabled: boolean;
      tools: string[];
    };
  };
  reporting: {
    output: string;
    format: string[];
    metrics: boolean;
    trends: boolean;
  };
}

class CodeQualityChecker {
  private config: CodeQualityConfig;
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): CodeQualityConfig {
    const configPath = path.join(process.cwd(), '.code-quality.json');
    if (!fs.existsSync(configPath)) {
      throw new Error('Code quality configuration file not found');
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  private runCommand(command: string): string {
    try {
      return execSync(command, { encoding: 'utf8' });
    } catch (error) {
      if (error instanceof Error) {
        this.errors.push(`Command failed: ${command}\n${error.message}`);
      }
      return '';
    }
  }

  private checkESLint(): void {
    if (!this.config.tools.eslint?.enabled) return;

    console.log(chalk.blue('Running ESLint checks...'));
    const result = this.runCommand('eslint . --ext .ts,.tsx,.js,.jsx');
    if (result.includes('error')) {
      this.errors.push('ESLint found errors');
    }
  }

  private checkPrettier(): void {
    if (!this.config.tools.prettier?.enabled) return;

    console.log(chalk.blue('Running Prettier checks...'));
    const result = this.runCommand('prettier --check .');
    if (result.includes('error')) {
      this.errors.push('Prettier found formatting issues');
    }
  }

  private checkTypeScript(): void {
    if (!this.config.tools.typescript?.enabled) return;

    console.log(chalk.blue('Running TypeScript checks...'));
    const result = this.runCommand('tsc --noEmit');
    if (result.includes('error')) {
      this.errors.push('TypeScript found type errors');
    }
  }

  private checkTests(): void {
    if (!this.config.tools.jest?.enabled) return;

    console.log(chalk.blue('Running tests...'));
    const result = this.runCommand('jest --coverage');
    
    const coverage = this.config.tools.jest.coverage;
    if (coverage) {
      // Parse coverage report and check against thresholds
      Object.entries(coverage).forEach(([metric, threshold]) => {
        // Add coverage checking logic here
      });
    }
  }

  private checkE2E(): void {
    if (!this.config.tools.playwright?.enabled) return;

    console.log(chalk.blue('Running E2E tests...'));
    const result = this.runCommand('playwright test');
    if (result.includes('error')) {
      this.errors.push('E2E tests failed');
    }
  }

  private checkSecurity(): void {
    console.log(chalk.blue('Running security checks...'));
    
    // Run npm audit
    const auditResult = this.runCommand('npm audit');
    if (auditResult.includes('vulnerability')) {
      this.errors.push('Security vulnerabilities found');
    }

    // Check for outdated dependencies
    const outdatedResult = this.runCommand('npm outdated');
    if (outdatedResult) {
      this.warnings.push('Outdated dependencies found');
    }
  }

  private generateReport(): void {
    const reportDir = path.join(process.cwd(), this.config.reporting.output);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      errors: this.errors,
      warnings: this.warnings,
      metrics: {
        errorCount: this.errors.length,
        warningCount: this.warnings.length,
      },
    };

    if (this.config.reporting.format.includes('json')) {
      fs.writeFileSync(
        path.join(reportDir, 'code-quality-report.json'),
        JSON.stringify(report, null, 2)
      );
    }

    if (this.config.reporting.format.includes('html')) {
      // Generate HTML report
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Code Quality Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .error { color: red; }
              .warning { color: orange; }
            </style>
          </head>
          <body>
            <h1>Code Quality Report</h1>
            <p>Generated: ${report.timestamp}</p>
            
            <h2>Errors (${report.metrics.errorCount})</h2>
            <ul>
              ${report.errors.map(error => `<li class="error">${error}</li>`).join('')}
            </ul>

            <h2>Warnings (${report.metrics.warningCount})</h2>
            <ul>
              ${report.warnings.map(warning => `<li class="warning">${warning}</li>`).join('')}
            </ul>
          </body>
        </html>
      `;
      fs.writeFileSync(path.join(reportDir, 'code-quality-report.html'), html);
    }
  }

  public async run(): Promise<void> {
    console.log(chalk.green('Starting code quality checks...'));

    // Run all checks
    this.checkESLint();
    this.checkPrettier();
    this.checkTypeScript();
    this.checkTests();
    this.checkE2E();
    this.checkSecurity();

    // Generate report
    this.generateReport();

    // Print summary
    console.log('\nCode Quality Check Summary:');
    console.log(chalk.red(`Errors: ${this.errors.length}`));
    console.log(chalk.yellow(`Warnings: ${this.warnings.length}`));

    if (this.errors.length > 0) {
      console.log('\nErrors:');
      this.errors.forEach(error => console.log(chalk.red(`- ${error}`)));
    }

    if (this.warnings.length > 0) {
      console.log('\nWarnings:');
      this.warnings.forEach(warning => console.log(chalk.yellow(`- ${warning}`)));
    }

    if (this.errors.length > 0) {
      process.exit(1);
    }
  }
}

// Run the checker
const checker = new CodeQualityChecker();
checker.run().catch(error => {
  console.error(chalk.red('Error running code quality checks:'), error);
  process.exit(1);
}); 