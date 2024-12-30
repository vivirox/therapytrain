import express, { Request, Response, RequestHandler } from 'express';
import { box, randomBytes } from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

const router = express.Router();
const serverKeyPair = box.keyPair();

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

const processWithOllama = async (message: Uint8Array, clientContext: any) => {
  const decodedMessage = new TextDecoder().decode(message);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
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

router.options('/', (req: Request, res: Response) => {
  res.set(corsHeaders).sendStatus(200);
});

const chatHandler: RequestHandler = async (req, res) => {
  const clientPublicKey = req.headers['x-public-key'];
  
  if (!clientPublicKey) {
    res.status(401).json({ error: 'Missing client public key' });
    return;
  }

  try {
    const { message, clientContext, encrypted } = req.body;

    if (encrypted) {
      const [nonceStr, encryptedMessage] = message.split('.');
      const nonce = decodeBase64(nonceStr);
      const decryptedMessage = box.open(
        decodeBase64(encryptedMessage),
        nonce,
        decodeBase64(clientPublicKey as string),
        serverKeyPair.secretKey
      );
      if (!decryptedMessage) {
        throw new Error('Failed to decrypt message');
      }

      const response = await processWithOllama(decryptedMessage, clientContext);
      const responseNonce = randomBytes(box.nonceLength);
      const encryptedResponse = box(
        new TextEncoder().encode(response),
        responseNonce,
        decodeBase64(clientPublicKey as string),
        serverKeyPair.secretKey
      );

      res.status(200).json({ 
        response: `${encodeBase64(responseNonce)}.${encodeBase64(encryptedResponse)}`,
        encrypted: true 
      });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

router.post('/chat', chatHandler);

export default router;