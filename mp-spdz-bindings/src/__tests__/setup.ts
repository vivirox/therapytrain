import { EventEmitter } from 'events';

// Increase EventEmitter max listeners for testing multiple parties
EventEmitter.defaultMaxListeners = 20;

// Global test timeout
jest.setTimeout(10000);

// Mock crypto for consistent random values in tests
const mockRandomValues = new Uint8Array([
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
  0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10
]);

global.crypto = {
  getRandomValues: (buffer: Uint8Array) => {
    buffer.set(mockRandomValues.subarray(0, buffer.length));
    return buffer;
  },
  randomBytes: (size: number) => {
    return Buffer.from(mockRandomValues.subarray(0, size));
  },
  createHash: (algorithm: string) => {
    return require('crypto').createHash(algorithm);
  },
  createHmac: (algorithm: string, key: Buffer) => {
    return require('crypto').createHmac(algorithm, key);
  }
} as any;

// Mock WebSocket for testing
class MockWebSocket extends EventEmitter {
  public readyState: number = 1; // WebSocket.OPEN

  constructor(public url: string) {
    super();
  }

  send(data: string | Buffer) {
    // Echo back the message for testing
    process.nextTick(() => {
      this.emit('message', { data });
    });
  }

  close() {
    this.emit('close');
  }
}

global.WebSocket = MockWebSocket as any;

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
}); 