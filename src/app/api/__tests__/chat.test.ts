import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/ssr';
import { createParser } from 'eventsource-parser';
import { StreamingTextResponse } from '@/lib/streaming-text-response';
import { GET, POST } from '../chat/route';
import { encryptMessageForRecipient, decryptMessageContent } from '@/lib/encryption/message-encryption';
import { logMessageEncryption, logMessageDecryption, logMessageAccess } from '@/lib/audit/audit-logger';
import { getRateLimit, isTooManyRequests, createRateLimitResponse } from '@/lib/edge/rate-limit';

// Mock service types
const MockConnectionStore = { getInstance: vi.fn() };
const MockInstanceManager = { getInstance: vi.fn() };
const MockRateLimiter = { getInstance: vi.fn() };
const MockResourceMonitor = { getInstance: vi.fn() };

// Mock dependencies
vi.mock('@supabase/ssr', () => ({
  createRouteHandlerClient: vi.fn(),
}));

// Mock OpenAIStream
const OpenAIStream = {
  fromMessages: vi.fn(),
};

vi.mock('eventsource-parser', () => ({
  createParser: vi.fn(),
}));

vi.mock('@/lib/streaming-text-response', () => ({
  StreamingTextResponse: vi.fn()
}));

vi.mock('@/lib/encryption/message-encryption', () => ({
  encryptMessageForRecipient: vi.fn(),
  decryptMessageContent: vi.fn(),
}));

vi.mock('@/lib/audit/audit-logger', () => ({
  logMessageEncryption: vi.fn(),
  logMessageDecryption: vi.fn(),
  logMessageAccess: vi.fn(),
}));

vi.mock('@/lib/edge/rate-limit', () => ({
  getRateLimit: vi.fn(),
  isTooManyRequests: vi.fn(),
  createRateLimitResponse: vi.fn(),
}));

vi.mock('@/lib/services/ConnectionStore', () => ({
  ConnectionStore: {
    getInstance: vi.fn(() => ({
      addConnection: vi.fn(),
      removeConnection: vi.fn(),
      sendEvent: vi.fn(),
    })),
  },
}));

vi.mock('@/lib/services/InstanceManager', () => ({
  InstanceManager: {
    getInstance: vi.fn(() => ({
      registerInstance: vi.fn(),
      selectInstanceForConnection: vi.fn(),
      instanceId: 'test-instance',
    })),
  },
}));

vi.mock('@/lib/services/RateLimiter', () => ({
  RateLimiter: {
    getInstance: vi.fn(() => ({
      checkLimit: vi.fn(),
      incrementCounter: vi.fn(),
    })),
  },
}));

vi.mock('@/lib/services/ResourceMonitor', () => ({
  ResourceMonitor: {
    getInstance: vi.fn(() => ({
      startMonitoring: vi.fn(),
      stopMonitoring: vi.fn(),
      trackRequest: vi.fn(),
      trackError: vi.fn(),
    })),
  },
}));

describe('Chat API', () => {
  let mockSupabase: any;
  let mockSession: any;
  let mockConnectionStore: any;
  let mockInstanceManager: any;
  let mockRateLimiter: any;
  let mockResourceMonitor: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock session
    mockSession = {
      user: {
        id: 'test-user-id',
      },
    };

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
      }),
    };

    (createRouteHandlerClient as any).mockReturnValue(mockSupabase);

    // Setup service mocks
    mockConnectionStore = MockConnectionStore.getInstance();
    mockInstanceManager = MockInstanceManager.getInstance();
    mockRateLimiter = MockRateLimiter.getInstance();
    mockResourceMonitor = MockResourceMonitor.getInstance();
  });

  describe('GET handler', () => {
    it('should return 400 if userId is missing', async () => {
      const req = new NextRequest('http://localhost/api/chat');
      const response = await GET(req);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Missing userId');
    });

    it('should return 401 if not authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });

      const req = new NextRequest('http://localhost/api/chat?userId=test-user');
      const response = await GET(req);

      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');
    });

    it('should handle message history request', async () => {
      const mockMessages = [
        { id: 1, content: 'test message' },
      ];

      mockSupabase.from().select().order().eq()
        .mockResolvedValueOnce({ data: mockMessages, error: null });

      (mockRateLimiter.checkLimit as any).mockResolvedValueOnce({
        remaining: 10,
        reset: 1234567890,
        total: 100,
      });

      const req = new NextRequest('http://localhost/api/chat?userId=test-user&mode=history');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.messages).toEqual(mockMessages);
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('10');
    });

    it('should handle rate limit exceeded for history request', async () => {
      (mockRateLimiter.checkLimit as any).mockResolvedValueOnce({
        remaining: 0,
        reset: 1234567890,
        total: 100,
      });

      const mockRateLimitResponse = new Response('Rate limit exceeded', { status: 429 });
      (createRateLimitResponse as any).mockReturnValueOnce(mockRateLimitResponse);

      const req = new NextRequest('http://localhost/api/chat?userId=test-user&mode=history');
      const response = await GET(req);

      expect(response.status).toBe(429);
      expect(await response.text()).toBe('Rate limit exceeded');
    });

    it('should handle SSE connection request', async () => {
      (mockRateLimiter.checkLimit as any).mockResolvedValueOnce({
        remaining: 10,
        reset: 1234567890,
        total: 100,
      });

      (mockInstanceManager.selectInstanceForConnection as any).mockResolvedValueOnce({
        instanceId: 'test-instance',
        host: 'localhost',
        port: 3000,
      });

      const req = new NextRequest('http://localhost/api/chat?userId=test-user&threadId=test-thread');
      const response = await GET(req);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Connection')).toBe('keep-alive');
    });

    it('should handle no available instances', async () => {
      (mockRateLimiter.checkLimit as any).mockResolvedValueOnce({
        remaining: 10,
        reset: 1234567890,
        total: 100,
      });

      (mockInstanceManager.selectInstanceForConnection as any).mockResolvedValueOnce(null);

      const req = new NextRequest('http://localhost/api/chat?userId=test-user&threadId=test-thread');
      const response = await GET(req);

      expect(response.status).toBe(503);
      expect(await response.text()).toBe('Service unavailable');
    });
  });

  describe('POST handler', () => {
    it('should handle unauthorized request', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: 'Unauthorized' });

      const req = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ content: 'test message' }],
          threadId: 'test-thread',
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');
    });

    it('should handle message sending', async () => {
      const mockEncryptedMessage = {
        encryptedContent: 'encrypted',
        iv: 'iv',
        senderPublicKey: 'public-key',
      };

      (encryptMessageForRecipient as any).mockResolvedValueOnce(mockEncryptedMessage);

      mockSupabase.from().insert.mockResolvedValueOnce({ error: null });

      const mockStream = new ReadableStream();
      (OpenAIStream.fromMessages as any).mockResolvedValueOnce(mockStream);
      (StreamingTextResponse as any).mockImplementationOnce((stream) => new Response(stream));

      const req = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ content: 'test message', role: 'user' }],
          threadId: 'test-thread',
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(encryptMessageForRecipient).toHaveBeenCalled();
      expect(logMessageEncryption).toHaveBeenCalled();
      expect(OpenAIStream.fromMessages).toHaveBeenCalled();
    });

    it('should handle message storage error', async () => {
      const mockEncryptedMessage = {
        encryptedContent: 'encrypted',
        iv: 'iv',
        senderPublicKey: 'public-key',
      };

      (encryptMessageForRecipient as any).mockResolvedValueOnce(mockEncryptedMessage);

      mockSupabase.from().insert.mockResolvedValueOnce({ error: new Error('Storage error') });

      const req = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ content: 'test message', role: 'user' }],
          threadId: 'test-thread',
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(500);
      expect(await response.text()).toBe('Failed to store message');
    });
  });
}); 