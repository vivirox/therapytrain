import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { type Message } from '../../ollama/process';
import { TherapeuticAIProcessor } from '@/ai/processor';
import type { ClientProfile } from '@/types/ClientProfile';
import type { Database } from '@/types/supabase';

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
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

    // Store interaction in Supabase
    const { error: insertError } = await supabase
      .from('interactions')
      .insert({
        client_id: client_profile.id,
        user_id: session.user.id,
        message: messages[messages.length - 1].content,
        response: response.content,
        analysis: response.analysis,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Failed to store interaction:', insertError);
    }

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