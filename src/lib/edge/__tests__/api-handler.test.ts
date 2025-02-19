import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { createEdgeApiHandler, createStreamingHandler } from '../api-handler';
import { edgeCache } from '../cache';
import { getRateLimit, isTooManyRequests, createRateLimitResponse } from '../rate-limit';
import { Logger } from '../../logger';

// Mock dependencies
vi.mock('../cache', () => ({
  edgeCache: vi.fn(),
}));

vi.mock('../rate-limit', () => ({
  getRateLimit: vi.fn(),
  isTooManyRequests: vi.fn(),
  createRateLimitResponse: vi.fn(),
}));

vi.mock('../../logger', () => ({
  Logger: {
    getInstance: () => ({
      info: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe('Edge API Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createEdgeApiHandler', () => {
    it('should handle successful requests', async () => {
      const mockData = { message: 'success' };
      const mockHandler = vi.fn().mockResolvedValue(mockData);
      const handler = createEdgeApiHandler(mockHandler);

      const req = new NextRequest('https://example.com/api/test');
      (getRateLimit as any).mockResolvedValue({ success: true });
      (isTooManyRequests as any).mockReturnValue(false);
      (edgeCache as any).mockResolvedValue(mockData);

      const response = await handler(req);
      const data = await response.json();

      expect(data).toEqual(mockData);
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should handle rate limiting', async () => {
      const mockHandler = vi.fn();
      const handler = createEdgeApiHandler(mockHandler, {
        rateLimit: { enabled: true }
      });

      const req = new NextRequest('https://example.com/api/test');
      const mockRateLimitResponse = new Response('Rate limit exceeded', { status: 429 });
      
      (getRateLimit as any).mockResolvedValue({ success: false });
      (isTooManyRequests as any).mockReturnValue(true);
      (createRateLimitResponse as any).mockReturnValue(mockRateLimitResponse);

      const response = await handler(req);

      expect(response.status).toBe(429);
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should handle streaming responses', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue('test data');
          controller.close();
        }
      });

      const mockHandler = vi.fn().mockResolvedValue(mockStream);
      const handler = createEdgeApiHandler(mockHandler, {
        enableStreaming: true
      });

      const req = new NextRequest('https://example.com/api/test');
      (getRateLimit as any).mockResolvedValue({ success: true });
      (isTooManyRequests as any).mockReturnValue(false);
      (edgeCache as any).mockResolvedValue(mockStream);

      const response = await handler(req);

      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Connection')).toBe('keep-alive');
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Test error');
      const mockHandler = vi.fn().mockRejectedValue(mockError);
      const handler = createEdgeApiHandler(mockHandler);

      const req = new NextRequest('https://example.com/api/test');
      (getRateLimit as any).mockResolvedValue({ success: true });
      (isTooManyRequests as any).mockReturnValue(false);
      (edgeCache as any).mockRejectedValue(mockError);

      const response = await handler(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
    });

    it('should use cache with provided options', async () => {
      const mockData = { message: 'cached' };
      const mockHandler = vi.fn().mockResolvedValue(mockData);
      const handler = createEdgeApiHandler(mockHandler, {
        cacheTtl: 60,
        cacheTags: ['test'],
        enableCoalescing: true
      });

      const req = new NextRequest('https://example.com/api/test');
      (getRateLimit as any).mockResolvedValue({ success: true });
      (isTooManyRequests as any).mockReturnValue(false);
      (edgeCache as any).mockResolvedValue(mockData);

      await handler(req);

      expect(edgeCache).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        {
          ttl: 60,
          tags: ['test'],
          coalesce: true
        }
      );
    });
  });

  describe('createStreamingHandler', () => {
    it('should create a streaming response', async () => {
      const mockChunks = ['chunk1', 'chunk2', 'chunk3'];
      const handler = createStreamingHandler(async (req, { onChunk, onComplete }) => {
        for (const chunk of mockChunks) {
          onChunk(chunk);
        }
        onComplete();
      });

      const req = new NextRequest('https://example.com/api/stream');
      const response = await handler(req);
      const reader = response.body?.getReader();

      if (reader) {
        const chunks: string[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(new TextDecoder().decode(value));
        }

        expect(chunks.length).toBe(mockChunks.length);
        chunks.forEach((chunk, i) => {
          expect(chunk).toContain(`data: ${mockChunks[i]}`);
        });
      }

      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Connection')).toBe('keep-alive');
    });

    it('should handle streaming errors', async () => {
      const mockError = new Error('Stream error');
      const handler = createStreamingHandler(async (req, { onError }) => {
        onError(mockError);
      });

      const req = new NextRequest('https://example.com/api/stream');
      const response = await handler(req);
      const reader = response.body?.getReader();

      if (reader) {
        await expect(reader.read()).rejects.toThrow('Stream error');
      }
    });
  });
}); 