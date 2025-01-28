import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { type Message } from '../../ollama/process';
import { TherapeuticAIProcessor } from '@/ai/processor';
import type { ClientProfile } from '@/types/ClientProfile';

export async function POST(req: Request) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { messages, client_profile } = await req.json();

    if (!client_profile) {
      throw new Error('Client profile is required');
    }

    const processor = new TherapeuticAIProcessor(client_profile as ClientProfile);
    const response = await processor.processMessage(messages as Array<Message>);

    // Store interaction using Kinde Management API
    await fetch(`${process.env.KINDE_ISSUER_URL}/api/v1/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.KINDE_CLIENT_SECRET}`,
      },
      body: JSON.stringify({
        client_id: client_profile.id,
        message: messages[messages.length - 1].content,
        response: response.content,
        analysis: response.analysis,
        timestamp: new Date().toISOString()
      }),
    });

    return new Response(JSON.stringify({
      message: response.content,
      analysis: response.analysis
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process chat message' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}