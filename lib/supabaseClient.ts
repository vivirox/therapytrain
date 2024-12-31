
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_ANON_KEY
const supabaseAnonKey = process.env.VITE_SUPABASE_URL

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!)
