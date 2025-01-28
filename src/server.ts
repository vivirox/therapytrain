import express from 'express';
import chatRouter from '../supabase/functions/chat';
import path from 'path';

const port = process.env.PORT || 3000;
const app = express();
app.use(express.json());
app.use('/api', chatRouter);
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

const processWithOllama = async (message: Uint8Array, clientContext: any) => {
  const decodedMessage = new TextDecoder().decode(message);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000); // 30s timeout
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
            content: `You are role-playing as a therapy client with the following characteristics:
          - Name: ${clientContext.name}
          - Age: ${clientContext.age}
          - Primary Issue: ${clientContext.primaryIssue}
          - Background: ${clientContext.background}
          - Key Traits: ${clientContext.keyTraits.join(', ')}
          - Case Complexity: ${clientContext.complexity}`
          },
          { role: "user", content: decodedMessage }
        ],
      }),
      signal: controller.signal,
    });

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

app.listen(port, () => {
  console.log(`Black Mage Forest running at http://localhost:${port}`);
});