import { createClient } from '@supabase/supabase-js';
import { TEST_CONFIG } from '../../e2e/test-config';

const isTest = process.env.NODE_ENV === 'test';

const supabaseUrl = isTest ? TEST_CONFIG.supabase.url : process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = isTest ? TEST_CONFIG.supabase.anonKey : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 