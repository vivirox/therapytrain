import { ReadableStream } from 'stream/web';

export class StreamingTextResponse extends Response {
  constructor(
    stream: ReadableStream | AsyncGenerator<string | Buffer, any, any>,
    init?: ResponseInit
  ) {
    let readableStream: ReadableStream;

    if (stream instanceof ReadableStream) {
      readableStream = stream;
    } else {
      readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const text = chunk.toString();
              controller.enqueue(new TextEncoder().encode(text));
            }
          } catch (error) {
            controller.error(error);
          } finally {
            controller.close();
          }
        },
      });
    }

    super(readableStream, {
      ...init,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
        ...init?.headers,
      },
    });
  }
}

export function streamToResponse(
  stream: ReadableStream | AsyncGenerator<string | Buffer, any, any>,
  init?: ResponseInit
): Response {
  return new StreamingTextResponse(stream, init);
} 