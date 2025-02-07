import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
}
// Create Supabase client with additional options
export const supabase: SupabaseClient<Database> = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    },
    db: {
        schema: 'public'
    }
});
export const connectDB: SupabaseClient<Database> = async () => {
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            throw error;
        }
        console.log('Supabase Connected...');
        return supabase;
    }
    catch (error) {
        console.error('Error connecting to Supabase:', error);
        process.exit(1);
    }
};

export interface Database {
    public: { Tables: { [key: string]: any } };
}
