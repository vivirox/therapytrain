import { createSupabaseClient } from "@supabase/auth-helpers-shared";
import { SupabaseClient, SupabaseClientOptions } from "@supabase/supabase-js";

export class TherapyChat {
  private supabase: SupabaseClient;
  
  constructor(supabaseUrl: string, supabaseKey: string, options?: SupabaseClientOptions<any>) {
    this.supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
      ...options,
      auth: {
        ...options?.auth,
        storage: options?.auth?.storage || localStorage,
      },
    });
  }
  async initializeSession(sessionId: string, clientProfile: string) {
    return await this.supabase
      .from('therapy_sessions')
      .insert({
        session_id: sessionId,
        client_profile: clientProfile,
        status: 'active',
        messages: [],
        emotional_state: 'baseline'
      });
  }

  subscribeToSession(sessionId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel(`therapy_messages:session_id=eq.${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'therapy_messages', filter: `session_id=eq.${sessionId}` }, payload: unknown => callback(payload))
      .subscribe();
  }
}
