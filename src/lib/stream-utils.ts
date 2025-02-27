declare module '@/lib/stream-utils' {
  export async function* streamToAsyncIterable<T>(stream: ReadableStream<T>): AsyncGenerator<T>;
}

export async function* streamToAsyncIterable<T>(stream: ReadableStream<T>) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
} 