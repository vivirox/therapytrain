import { JIFFAdapter, JIFFAdapterConfig } from '../src/lib/mpc/mp-spdz-bindings/jiff-adapter';
import { MPCProtocol } from '../src/lib/mpc/mp-spdz-bindings/types';
import { TestEnvironment, TestConfig } from '../src/lib/mpc/mp-spdz-bindings/__integration_tests__/setup';

interface OperationMetrics {
  operation: string;
  protocol: MPCProtocol;
  averageTime: number;
  minTime: number;
  maxTime: number;
  numParties: number;
  batchSize: number;
  memoryUsage: number;
}

interface TestCase {
  name: string;
  values: number[];
  operation: 'share' | 'multiply' | 'compare' | 'xor';
}

class PerformanceProfiler {
  private metrics: OperationMetrics[] = [];
  private env: TestEnvironment;
  private adapters: JIFFAdapter[];

  constructor(
    private protocol: MPCProtocol,
    private numParties: number,
    private batchSize: number
  ) {
    const testConfig: TestConfig = {
      protocol,
      numParties,
      basePort: 14000,
      preprocessingDir: '__tests__/preprocessing',
      binaryDir: process.env.MP_SPDZ_BINARY_DIR || '/usr/local/bin'
    };

    this.env = new TestEnvironment(testConfig);
    this.adapters = Array.from({ length: numParties }, (_, i) => {
      const config: JIFFAdapterConfig = {
        partyId: i,
        numParties,
        threshold: 1,
        protocol
      };
      return new JIFFAdapter(config);
    });
  }

  async setup(): Promise<void> {
    await this.env.generatePreprocessing();
    await this.env.startAllParties();
  }

  async cleanup(): Promise<void> {
    await this.env.cleanup();
  }

  private async measureOperation(
    testCase: TestCase
  ): Promise<OperationMetrics> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    const times: number[] = [];

    for (let batch = 0; batch < this.batchSize; batch++) {
      const batchStartTime = Date.now();

      switch (testCase.operation) {
        case 'share': {
          await Promise.all(
            testCase.values.map(value =>
              Promise.all(this.adapters.map(adapter => adapter.share(value)))
            )
          );
          break;
        }
        case 'multiply': {
          const shares = await Promise.all(
            testCase.values.map(value =>
              Promise.all(this.adapters.map(adapter => adapter.share(value)))
            )
          );

          await Promise.all(
            shares.map(async (partyShares, i) => {
              if (i === shares.length - 1) return;
              const nextShares = shares[i + 1];

              return Promise.all(
                this.adapters.map((adapter, j) =>
                  adapter.multiply(partyShares[j], nextShares[j])
                )
              );
            })
          );
          break;
        }
        case 'compare': {
          const shares = await Promise.all(
            testCase.values.map(value =>
              Promise.all(this.adapters.map(adapter => adapter.share(value)))
            )
          );

          await Promise.all(
            shares.map(async (partyShares, i) => {
              if (i === shares.length - 1) return;
              const nextShares = shares[i + 1];

              return Promise.all(
                this.adapters.map((adapter, j) =>
                  adapter.greaterThan(partyShares[j], nextShares[j])
                )
              );
            })
          );
          break;
        }
        case 'xor': {
          const shares = await Promise.all(
            testCase.values.map(value =>
              Promise.all(this.adapters.map(adapter => adapter.share(value)))
            )
          );

          await Promise.all(
            shares.map(async (partyShares, i) => {
              if (i === shares.length - 1) return;
              const nextShares = shares[i + 1];

              return Promise.all(
                this.adapters.map((adapter, j) =>
                  adapter.xor(partyShares[j], nextShares[j])
                )
              );
            })
          );
          break;
        }
      }

      times.push(Date.now() - batchStartTime);
    }

    const endMemory = process.memoryUsage().heapUsed;
    const totalTime = Date.now() - startTime;

    return {
      operation: testCase.name,
      protocol: this.protocol,
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      numParties: this.numParties,
      batchSize: this.batchSize,
      memoryUsage: endMemory - startMemory
    };
  }

  async runTestCase(testCase: TestCase): Promise<void> {
    console.log(`Running test case: ${testCase.name}`);
    const metrics = await this.measureOperation(testCase);
    this.metrics.push(metrics);
    this.printMetrics(metrics);
  }

  private printMetrics(metrics: OperationMetrics): void {
    console.log('\nPerformance Metrics:');
    console.log('-------------------');
    console.log(`Operation: ${metrics.operation}`);
    console.log(`Protocol: ${metrics.protocol}`);
    console.log(`Number of Parties: ${metrics.numParties}`);
    console.log(`Batch Size: ${metrics.batchSize}`);
    console.log(`Average Time: ${metrics.averageTime.toFixed(2)}ms`);
    console.log(`Min Time: ${metrics.minTime}ms`);
    console.log(`Max Time: ${metrics.maxTime}ms`);
    console.log(`Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    console.log('-------------------\n');
  }

  async generateReport(): Promise<void> {
    console.log('\nPerformance Report');
    console.log('=================\n');

    // Group by operation
    const operationGroups = new Map<string, OperationMetrics[]>();
    for (const metric of this.metrics) {
      const group = operationGroups.get(metric.operation) || [];
      group.push(metric);
      operationGroups.set(metric.operation, group);
    }

    // Print summary for each operation
    for (const [operation, metrics] of operationGroups) {
      console.log(`Operation: ${operation}`);
      console.log('-------------------');
      
      const avgTime = metrics.reduce((sum, m) => sum + m.averageTime, 0) / metrics.length;
      const avgMemory = metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length;
      
      console.log(`Average Time Across All Runs: ${avgTime.toFixed(2)}ms`);
      console.log(`Average Memory Usage: ${(avgMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log('-------------------\n');
    }

    // Print recommendations
    console.log('Recommendations:');
    console.log('---------------');
    
    // Analyze performance patterns
    for (const [operation, metrics] of operationGroups) {
      const avgTime = metrics.reduce((sum, m) => sum + m.averageTime, 0) / metrics.length;
      
      if (avgTime > 100) {
        console.log(`- ${operation}: Consider batch processing to improve performance`);
      }
      
      const memoryVariance = metrics.reduce((sum, m) => sum + Math.pow(m.memoryUsage - avgMemory, 2), 0) / metrics.length;
      if (memoryVariance > 1000000) {
        console.log(`- ${operation}: High memory variance detected, consider memory optimization`);
      }
    }
  }
}

async function main() {
  const protocols = [MPCProtocol.MASCOT, MPCProtocol.SPDZ2K, MPCProtocol.SEMI2K];
  const numParties = 3;
  const batchSize = 10;

  const testCases: TestCase[] = [
    {
      name: 'Small Integer Share',
      values: Array.from({ length: 100 }, (_, i) => i),
      operation: 'share'
    },
    {
      name: 'Large Integer Share',
      values: Array.from({ length: 100 }, () => Math.floor(Math.random() * 1000000)),
      operation: 'share'
    },
    {
      name: 'Integer Multiplication',
      values: Array.from({ length: 100 }, () => Math.floor(Math.random() * 1000)),
      operation: 'multiply'
    },
    {
      name: 'Integer Comparison',
      values: Array.from({ length: 100 }, () => Math.floor(Math.random() * 1000)),
      operation: 'compare'
    },
    {
      name: 'Bitwise XOR',
      values: Array.from({ length: 100 }, () => Math.floor(Math.random() * 256)),
      operation: 'xor'
    }
  ];

  for (const protocol of protocols) {
    console.log(`\nTesting protocol: ${protocol}`);
    const profiler = new PerformanceProfiler(protocol, numParties, batchSize);
    
    try {
      await profiler.setup();
      
      for (const testCase of testCases) {
        await profiler.runTestCase(testCase);
      }
      
      await profiler.generateReport();
    } finally {
      await profiler.cleanup();
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
} 