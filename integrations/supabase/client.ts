import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || ''; // Ensure you have the anon key set in your environment variables
export const supabase = createClient(supabaseUrl, supabaseKey);
