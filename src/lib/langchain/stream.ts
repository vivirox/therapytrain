import { Message } from 'ai'
import { BaseCallbackHandler } from 'langchain/callbacks'
import { AIMessage, HumanMessage } from 'langchain/schema'

export class StreamingHandler extends BaseCallbackHandler {
  private stream: WritableStream<string>
  private encoder: TextEncoder
  private writer: WritableStreamDefaultWriter<string>

  constructor(stream: WritableStream<string>) {
    super()
    this.stream = stream
    this.encoder = new TextEncoder()
    this.writer = this.stream.getWriter()
  }

  async handleLLMNewToken(token: string) {
    await this.writer.write(token)
  }

  async handleLLMEnd() {
    await this.writer.close()
  }

  async handleLLMError(error: Error) {
    await this.writer.abort(error)
  }
}

export function createLangchainMessages(messages: Message[]) {
  return messages.map((message) => {
    if (message.role === 'user') {
      return new HumanMessage(message.content)
    }
    return new AIMessage(message.content)
  })
}

export function createStream(): TransformStream<Uint8Array, string> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  return new TransformStream({
    transform(chunk: Uint8Array, controller: TransformStreamDefaultController<string>) {
      const text = decoder.decode(chunk)
      controller.enqueue(text)
    },
  })
}

interface StreamCallbacks {
  onToken?: () => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export function LangChainStream(callbacks?: StreamCallbacks) {
  const stream = createStream();
  const handler = new StreamingHandler(stream.writable);

  if (callbacks) {
    if (callbacks.onToken) handler.handleLLMNewToken = async () => callbacks.onToken?.();
    if (callbacks.onComplete) handler.handleLLMEnd = async () => callbacks.onComplete?.();
    if (callbacks.onError) handler.handleLLMError = async (error) => callbacks.onError?.(error);
  }

  return {
    stream: stream.readable,
    handlers: handler,
  };
} 