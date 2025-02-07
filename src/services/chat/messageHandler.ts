import { SupabaseClient } from '@supabase/supabase-js';
import { InterventionOptimizationSystem } from "../../services/interventionOptimization";
import { EncryptionService } from "../../services/encryption";
interface MessageMetadata {
    interventionType?: string;
    therapeuticApproach?: string;
}
export class TherapyMessageHandler {
    private static instance: TherapyMessageHandler;
    private supabase: SupabaseClient;
    private encryption: EncryptionService;
    private optimizer: InterventionOptimizationSystem;
    private constructor(supabaseClient: SupabaseClient) {
        this.supabase = supabaseClient;
        this.encryption = EncryptionService.getInstance();
        this.optimizer = InterventionOptimizationSystem.getInstance();
    }
    public static getInstance(supabaseClient: SupabaseClient): TherapyMessageHandler {
        if (!TherapyMessageHandler.instance) {
            TherapyMessageHandler.instance = new TherapyMessageHandler(supabaseClient);
        }
        return TherapyMessageHandler.instance;
    }
    async handleMessage(sessionId: string, content: string, metadata: MessageMetadata): Promise<void> {
        const encryptedContent = await this.encryption.encryptSessionData(sessionId, content);
        const { data, error } = await this.supabase
            .from('therapy_messages')
            .insert({
            session_id: sessionId,
            content: encryptedContent,
            timestamp: new Date().toISOString(),
            metadata
        });
        if (error) {
            throw new Error(`Message handling failed: ${error.message}`);
        }
        const recommendations = this.optimizer.getRecommendations(content);
    }
}
