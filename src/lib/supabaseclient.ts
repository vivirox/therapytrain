import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabaseOptions = {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    global: {
        headers: {
            'x-application-name': 'TherapyTrain'
        }
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
};

export const supabase = createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    supabaseOptions
);

export const getServiceSupabase = () => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
        throw new Error('Missing service role key');
    }
    return createClient<Database>(supabaseUrl, serviceRoleKey, {
        ...supabaseOptions,
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};

// Helper functions for common Supabase operations
export const getUser = async () => {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
};

export const getSession = async () => {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    } catch (error) {
        console.error('Error getting session:', error);
        return null;
    }
};

export const signOut = async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    } catch (error) {
        console.error('Error signing out:', error);
        throw error;
    }
};

export const updateUserProfile = async (updates: {
    username?: string;
    full_name?: string;
    avatar_url?: string;
    website?: string;
}) => {
    try {
        const user = await getUser();
        if (!user) throw new Error('No user logged in');

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (error) throw error;
    } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
};

export const uploadFile = async (
    bucket: string,
    path: string,
    file: File
) => {
    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
};

export const deleteFile = async (
    bucket: string,
    path: string
) => {
    try {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([path]);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
};

export const getPublicUrl = (
    bucket: string,
    path: string
) => {
    return supabase.storage
        .from(bucket)
        .getPublicUrl(path)
        .data.publicUrl;
};

// Export types
export type { Database };

export interface Database {
    public: { Tables: { [key: string]: any } };
}
 