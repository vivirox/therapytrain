import { createClient } from '@supabase/supabase-js';
import { type Message } from '../../ollama/process';
import { TherapeuticAIProcessor } from '@/ai/processor';
import type { ClientProfile } from '@/types/ClientProfile';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  try {
    const { messages, client_profile } = await req.json();

    if (!client_profile) {
      throw new Error('Client profile is required');
    }

    const processor = new TherapeuticAIProcessor(client_profile as ClientProfile);
    const response = await processor.processMessage(messages as Message[]);

    // Store the interaction for analysis
    await supabase
      .from('interactions')
      .insert({
        client_id: client_profile.id,
        message: messages[messages.length - 1].content,
        response: response.content,
        analysis: response.analysis,
        timestamp: new Date().toISOString()
      });

    return new Response(
      JSON.stringify({
        message: response.content,
        analysis: response.analysis
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat message' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
