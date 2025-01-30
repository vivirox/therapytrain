import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseKey);

// Example function to fetch data
export const fetchData = async (tableName) => {
  const { data, error } = await supabase.from(tableName).select('*');
  if (error) {
    console.error('Error fetching data:', error);
    return null;
  }
  return data;
};

// Example function to insert data
export const insertData = async (tableName, newData) => {
  const { data, error } = await supabase.from(tableName).insert(newData);
  if (error) {
    console.error('Error inserting data:', error);
    return null;
  }
  return data;
};
