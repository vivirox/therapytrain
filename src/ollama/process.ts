interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const OLLAMA_BASE_URL = 'https://api.gemcity.xyz';

async function processWithOllama(messages: Message[]) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral',  // or your preferred model
        messages: messages,
        stream: false,
        options: {
          temperature: 0.9,
          top_p: 0.95,
        }
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get response from Ollama');
    }

    const data = await response.json();
    return data.message?.content || '';
  } catch (error) {
    console.error('Ollama API Error:', error);
    throw error;
  }
}

export { processWithOllama, type Message };
