import fetch from 'node-fetch';

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function POST(req: Request) {
  const { messages }: { messages: Array<Message> } = await req.json();

  const response = await fetch(`${process.env.OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3.3',
      messages,
      stream: true,
    }),
  });

  const stream = response.body as unknown as ReadableStream<Uint8Array>;

  class StreamingTextResponse extends Response {
    constructor(stream: ReadableStream<Uint8Array>) {
      super(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    }
  }

  return new StreamingTextResponse(stream);
}