import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const fetchData = async (tableName: string) => {
  const { data, error } = await supabase.from(tableName).select('*')
  if (error) {
    console.error('Error fetching data:', error)
    return null
  }
  return data
}

// Test connection
const testConnection = async () => {
  const { data, error } = await supabase.from('your_actual_table_name').select('*'); // Replace with a valid table name
  if (error) {
    console.error('Connection test error:', error.message);
  } else {
    console.log('Connection test successful:', data);
  }
};

testConnection();
