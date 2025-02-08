// types/supabase.ts

import type { Database } from './database.types';
import { createClient } from '@supabase/supabase-js';

// Re-export the generated Database type
export type { Database };

// Utility type to get a table's row type
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

// Utility type to get a table's insert type
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];

// Utility type to get a table's update type
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Table types
export type User = Tables<'users'>;
export type Session = Tables<'sessions'>;
export type Message = Tables<'messages'>;
export type AuditLog = Tables<'audit_logs'>;
export type Client = Tables<'clients'>;
export type ClientProfile = Tables<'client_profiles'>;
export type Intervention = Tables<'interventions'>;
export type Assessment = Tables<'assessments'>;
export type Appointment = Tables<'appointments'>;
export type Alert = Tables<'alerts'>;
export type Feedback = Tables<'feedback'>;
export type Resource = Tables<'resources'>;
export type Setting = Tables<'settings'>;

// Insert types
export type InsertUser = InsertTables<'users'>;
export type InsertSession = InsertTables<'sessions'>;
export type InsertMessage = InsertTables<'messages'>;
export type InsertAuditLog = InsertTables<'audit_logs'>;
export type InsertClient = InsertTables<'clients'>;
export type InsertClientProfile = InsertTables<'client_profiles'>;
export type InsertIntervention = InsertTables<'interventions'>;
export type InsertAssessment = InsertTables<'assessments'>;
export type InsertAppointment = InsertTables<'appointments'>;
export type InsertAlert = InsertTables<'alerts'>;
export type InsertFeedback = InsertTables<'feedback'>;
export type InsertResource = InsertTables<'resources'>;
export type InsertSetting = InsertTables<'settings'>;

// Update types
export type UpdateUser = UpdateTables<'users'>;
export type UpdateSession = UpdateTables<'sessions'>;
export type UpdateMessage = UpdateTables<'messages'>;
export type UpdateAuditLog = UpdateTables<'audit_logs'>;
export type UpdateClient = UpdateTables<'clients'>;
export type UpdateClientProfile = UpdateTables<'client_profiles'>;
export type UpdateIntervention = UpdateTables<'interventions'>;
export type UpdateAssessment = UpdateTables<'assessments'>;
export type UpdateAppointment = UpdateTables<'appointments'>;
export type UpdateAlert = UpdateTables<'alerts'>;
export type UpdateFeedback = UpdateTables<'feedback'>;
export type UpdateResource = UpdateTables<'resources'>;
export type UpdateSetting = UpdateTables<'settings'>;

export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

export type Profile = Tables<'profiles'>;
export type Note = Tables<'notes'>;
export type Document = Tables<'documents'>;

export interface SupabaseConfig {
    url: string;
    anonKey: string;
    serviceRole?: string;
    options?: {
        auth?: {
            autoRefreshToken?: boolean;
            persistSession?: boolean;
            detectSessionInUrl?: boolean;
        };
        global?: {
            headers?: { [key: string]: string };
            fetch?: typeof fetch;
        };
        realtime?: {
            channels?: string[];
            config?: {
                broadcast?: {
                    self?: boolean;
                };
            };
        };
    };
}

export const createSupabaseClient = (config: SupabaseConfig) => {
    return createClient<Database>(
        config.url,
        config.anonKey,
        config.options
    );
};

export interface Database {
    public: { Tables: { [key: string]: any } };
}
