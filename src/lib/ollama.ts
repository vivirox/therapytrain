import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
const OLLAMA_BASE_URL = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';
export const generateResponse = async (prompt: string, clientContext: any) => {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'llama2',
            prompt,
            stream: false,
        }),
    });
    return response.json();
};

export interface Database {
    public: { Tables: { [key: string]: any } };
}
