import { createSupabaseClient } from "@supabase/ssr";
import { SupabaseClient, SupabaseClientOptions, RealtimeChannel, User, Session } from "@supabase/supabase-js";
import { supabase } from '@/lib/supabaseclient';

export class TherapyChat {
    private supabase: SupabaseClient;
    private subscription: RealtimeChannel | null = null;

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

    async subscribeToMessages(sessionId: string, callback: (message: any) => void): Promise<void> {
        this.subscription = supabase
            .channel(`messages:${sessionId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'therapy_messages',
                filter: `session_id=eq.${sessionId}`
            }, (payload) => {
                callback(payload.new);
            })
            .subscribe();
    }

    async unsubscribeFromMessages(): Promise<void> {
        if (this.subscription) {
            await this.subscription.unsubscribe();
            this.subscription = null;
        }
    }
}

export interface Database {
    public: { Tables: { [key: string]: any } };
}
