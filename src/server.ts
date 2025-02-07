import express, { Request, Response, NextFunction } from 'express';
import chatRouter from '@/supabase/functions/chat';
import path from 'path';
const port = process.env.PORT || 3000;
const app = express();
app.use(express.json());
app.use('/api', chatRouter);
app.get('/', (req: unknown, res: unknown) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});
interface ClientContext {
    name: string;
    age: number;
    primaryIssue: string;
    background: string;
    keyTraits: Array<string>;
    complexity: string;
}
class TimeoutError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TimeoutError';
    }
}
class NetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
    }
}
class UnexpectedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UnexpectedError';
    }
}
const processWithOllama = async (message: Uint8Array, clientContext: ClientContext) => {
    let decodedMessage;
    try {
        decodedMessage = new TextDecoder().decode(message);
    }
    catch (error) {
        console.error('Invalid UTF-8 encoding:', error);
        throw new Error('Invalid message encoding');
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    try {
        const response = await fetch(`${process.env.OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "sebdg/emotional_llama:latest",
                messages: [
                    {
                        role: "system",
                        content: systemPromptTemplate(clientContext)
                    },
                    { role: "user", content: decodedMessage }
                ],
            }),
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(`API responded with status ${response.status}`);
        }
        const data = await response.json();
        if (data && data.response) {
            return data.response;
        }
        else {
            throw new Error('Unexpected response structure');
        }
    }
    catch (error) {
        if (error.name === 'AbortError') {
            console.error('Request timed out:', error);
            throw new TimeoutError('The request took too long and was aborted.');
        }
        else if (error instanceof TypeError) {
            console.error('Network error:', error);
            throw new NetworkError('A network error occurred.');
        }
        else {
            console.error('Unexpected error:', error);
            throw new UnexpectedError('An unexpected error occurred.');
        }
    }
    finally {
        clearTimeout(timeoutId);
    }
};
app.listen(port, () => {
    console.log(`Black Mage Forest running at http://localhost:${port}`);
});
function systemPromptTemplate(clientContext: ClientContext) {
    return `You are a therapist assisting a client. Here is the client's context:
  - Name: ${clientContext.name}
  - Age: ${clientContext.age}
  - Primary Issue: ${clientContext.primaryIssue}
  - Background: ${clientContext.background}
  - Key Traits: ${clientContext.keyTraits.join(', ')}
  - Complexity: ${clientContext.complexity}

  Please provide a thoughtful and empathetic response to help the client with their issue.`;
}
