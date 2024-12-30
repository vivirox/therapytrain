import { StreamingTextResponse } from 'ai'

export const runtime = 'edge'

type Message = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function POST(req: Request) {
  const { messages }: { messages: Array<Message> } = await req.json()

  const response = await fetch(`${process.env.OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama2',
      messages,
      stream: true,
    }),
  })
  const stream = response.body as ReadableStream

  return new StreamingTextResponse(stream)
}
