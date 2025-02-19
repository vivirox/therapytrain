import { NextRequest, NextResponse } from 'next/server';
import { edgeCache, CacheOptions } from './cache';
import { getRateLimit, isTooManyRequests, createRateLimitResponse } from './rate-limit';
import { Logger } from '../logger';

const logger = new Logger('edge-api-handler');

interface EdgeApiConfig {
  cacheTtl?: number;
  cacheTags?: string[];
  enableCoalescing?: boolean;
  enableStreaming?: boolean;
  rateLimit?: {
    enabled: boolean;
    identifier?: (req: NextRequest) => string | Promise<string>;
  };
}

interface StreamingOptions {
  onChunk?: (chunk: any) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export function createEdgeApiHandler(
  handler: (req: NextRequest) => Promise<Response> | Promise<ReadableStream>,
  config: EdgeApiConfig = {}
) {
  const {
    cacheTtl,
    cacheTags = [],
    enableCoalescing = false,
    enableStreaming = false,
    rateLimit = { enabled: true }
  } = config;

  return async function edgeApiHandler(req: NextRequest): Promise<Response> {
    const startTime = Date.now();

    try {
      // Rate limiting
      if (rateLimit.enabled) {
        const identifier = await (rateLimit.identifier?.(req) ?? req.ip);
        const rateLimitResult = await getRateLimit(identifier);

        if (isTooManyRequests(rateLimitResult)) {
          return createRateLimitResponse(rateLimitResult);
        }
      }

      // Generate cache key from request
      const url = new URL(req.url);
      const cacheKey = `${req.method}:${url.pathname}${url.search}`;

      // Prepare cache options
      const cacheOptions: CacheOptions = {
        ttl: cacheTtl,
        tags: cacheTags,
        coalesce: enableCoalescing
      };

      if (enableStreaming) {
        // Handle streaming response
        const stream = await edgeCache(
          cacheKey,
          async () => {
            const result = await handler(req);
            
            if (result instanceof Response) {
              // Convert Response to ReadableStream if needed
              return result.body ?? new ReadableStream();
            }
            
            return result;
          },
          cacheOptions
        );

        // Create streaming response
        const response = new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });

        // Log request completion
        const duration = Date.now() - startTime;
        await logger.info('Edge API request completed', {
          method: req.method,
          path: url.pathname,
          duration,
          streaming: true
        });

        return response;
      } else {
        // Handle regular response
        const result = await edgeCache(
          cacheKey,
          async () => handler(req),
          cacheOptions
        );

        // If result is already a Response, return it
        if (result instanceof Response) {
          return result;
        }

        // Convert result to Response
        const response = new NextResponse(
          JSON.stringify(result),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        // Log request completion
        const duration = Date.now() - startTime;
        await logger.info('Edge API request completed', {
          method: req.method,
          path: url.pathname,
          duration,
          streaming: false
        });

        return response;
      }
    } catch (error) {
      // Log error
      await logger.error('Edge API request failed', error as Error);

      // Return error response
      return new NextResponse(
        JSON.stringify({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' 
            ? (error as Error).message 
            : undefined
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  };
}

// Helper to create a streaming response handler
export function createStreamingHandler(
  handler: (
    req: NextRequest,
    options: StreamingOptions
  ) => Promise<void>,
  config: EdgeApiConfig = {}
) {
  return async function streamingHandler(req: NextRequest): Promise<Response> {
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await handler(req, {
            onChunk: (chunk) => {
              const data = typeof chunk === 'string' ? chunk : JSON.stringify(chunk);
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            },
            onError: (error) => {
              controller.error(error);
            },
            onComplete: () => {
              controller.close();
            },
          });
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  };
} 