import { RedisService } from '@/services/RedisService';

// Mock metrics data
export interface MockMetrics {
  hitRate: number;
  averageLatency: number;
  totalOperations: number;
  invalidations: number;
  memoryUsage: number;
  connections: number;
  uptime: number;
}

export const generateTestMetrics = (overrides: Partial<MockMetrics> = {}): MockMetrics => ({
  hitRate: 0.95,
  averageLatency: 20,
  totalOperations: 1000,
  invalidations: 50,
  memoryUsage: 512 * 1024 * 1024, // 512MB
  connections: 100,
  uptime: 3600,
  ...overrides,
});

// Mock session metrics data
export interface MockSessionMetrics {
  operations: number;
  errors: number;
  latency: number[];
  lastActivity: number;
  nodeId: string;
}

export const generateTestSessionMetrics = (
  overrides: Partial<MockSessionMetrics> = {}
): MockSessionMetrics => ({
  operations: 100,
  errors: 2,
  latency: Array.from({ length: 10 }, () => 20 + Math.random() * 10),
  lastActivity: Date.now(),
  nodeId: 'node-1',
  ...overrides,
});

// Mock node metrics data
export interface MockNodeMetrics {
  sessions: number;
  operations: number;
  errors: number;
  errorRate: number;
  averageLatency: number;
  health: string;
}

export const generateTestNodeMetrics = (
  overrides: Partial<MockNodeMetrics> = {}
): MockNodeMetrics => ({
  sessions: 10,
  operations: 1000,
  errors: 20,
  errorRate: 0.02,
  averageLatency: 25,
  health: 'healthy',
  ...overrides,
});

// Mock performance stats data
export interface MockPerformanceStats {
  current: MockMetrics;
  hourlyAverage: {
    hitRate: number;
    latency: number;
    invalidationRate: number;
  };
  recommendations: string[];
}

export const generateTestPerformanceStats = (
  overrides: Partial<MockPerformanceStats> = {}
): MockPerformanceStats => ({
  current: generateTestMetrics(),
  hourlyAverage: {
    hitRate: 0.92,
    latency: 22,
    invalidationRate: 0.05,
  },
  recommendations: [
    'Consider increasing cache size',
    'Monitor high latency operations',
  ],
  ...overrides,
});

// Mock functions
let mockMetrics: MockMetrics = generateTestMetrics();
let mockSessionMetrics: Map<string, MockSessionMetrics> = new Map();
let mockNodeMetrics: Map<string, MockNodeMetrics> = new Map();
let mockMetricsHistory: Array<{ timestamp: number; metrics: MockMetrics }> = [];

export const setupMonitoringMocks = () => {
  mockMetrics = generateTestMetrics();
  mockSessionMetrics = new Map();
  mockNodeMetrics = new Map();
  mockMetricsHistory = [];
};

export const resetMonitoringMocks = () => {
  mockMetrics = generateTestMetrics();
  mockSessionMetrics = new Map();
  mockNodeMetrics = new Map();
  mockMetricsHistory = [];
};

// Mock API responses
export const mockGetCurrentMetrics = (): MockMetrics => {
  return mockMetrics;
};

export const mockGetMetricsHistory = (): Array<{
  timestamp: number;
  metrics: MockMetrics;
}> => {
  return mockMetricsHistory;
};

export const mockGetSessionMetrics = (sessionId: string): MockSessionMetrics | null => {
  return mockSessionMetrics.get(sessionId) || null;
};

export const mockGetNodeMetrics = (nodeId: string): MockNodeMetrics | null => {
  return mockNodeMetrics.get(nodeId) || null;
};

export const mockGetPerformanceStats = (): MockPerformanceStats => {
  return generateTestPerformanceStats();
};

// Test data generators
export const generateMetricsHistory = (
  hours: number,
  interval: number = 60000
): Array<{ timestamp: number; metrics: MockMetrics }> => {
  const now = Date.now();
  const history: Array<{ timestamp: number; metrics: MockMetrics }> = [];

  for (let i = hours * 60; i >= 0; i--) {
    const timestamp = now - i * interval;
    const metrics = generateTestMetrics({
      hitRate: 0.9 + Math.sin(i / 60) * 0.05,
      averageLatency: 20 + Math.cos(i / 60) * 5,
      totalOperations: 1000 + i * 10,
    });
    history.push({ timestamp, metrics });
  }

  return history;
};

export const generateSessionMetricsData = (
  sessionCount: number
): Map<string, MockSessionMetrics> => {
  const sessions = new Map();
  for (let i = 0; i < sessionCount; i++) {
    sessions.set(`session-${i}`, generateTestSessionMetrics({
      operations: 100 + Math.floor(Math.random() * 900),
      errors: Math.floor(Math.random() * 20),
      nodeId: `node-${Math.floor(i / 3)}`,
    }));
  }
  return sessions;
};

export const generateNodeMetricsData = (
  nodeCount: number
): Map<string, MockNodeMetrics> => {
  const nodes = new Map();
  for (let i = 0; i < nodeCount; i++) {
    nodes.set(`node-${i}`, generateTestNodeMetrics({
      sessions: 5 + Math.floor(Math.random() * 15),
      operations: 1000 + Math.floor(Math.random() * 9000),
      errors: Math.floor(Math.random() * 100),
    }));
  }
  return nodes;
};

// Assertion helpers
export const expectMetricsToBeValid = (metrics: MockMetrics) => {
  expect(metrics).toEqual(
    expect.objectContaining({
      hitRate: expect.any(Number),
      averageLatency: expect.any(Number),
      totalOperations: expect.any(Number),
      invalidations: expect.any(Number),
      memoryUsage: expect.any(Number),
      connections: expect.any(Number),
      uptime: expect.any(Number),
    })
  );
};

export const expectSessionMetricsToBeValid = (metrics: MockSessionMetrics) => {
  expect(metrics).toEqual(
    expect.objectContaining({
      operations: expect.any(Number),
      errors: expect.any(Number),
      latency: expect.any(Array),
      lastActivity: expect.any(Number),
      nodeId: expect.any(String),
    })
  );
};

export const expectNodeMetricsToBeValid = (metrics: MockNodeMetrics) => {
  expect(metrics).toEqual(
    expect.objectContaining({
      sessions: expect.any(Number),
      operations: expect.any(Number),
      errors: expect.any(Number),
      errorRate: expect.any(Number),
      averageLatency: expect.any(Number),
      health: expect.any(String),
    })
  );
};

// Error simulation
export const simulateMetricsError = () => {
  throw new Error('Failed to get metrics');
};

export const simulateHighLatency = () => {
  mockMetrics.averageLatency = 200;
};

export const simulateLowHitRate = () => {
  mockMetrics.hitRate = 0.5;
};

export const simulateHighErrorRate = (nodeId: string) => {
  const node = mockNodeMetrics.get(nodeId);
  if (node) {
    node.errorRate = 0.8;
    node.health = 'unhealthy';
    mockNodeMetrics.set(nodeId, node);
  }
}; 