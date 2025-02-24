const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    // Read the migration files
    const execSql = fs.readFileSync(
      path.join(__dirname, '../backend/migrations/create_exec_sql_function.sql'),
      'utf8'
    );

    const createAuthTables = fs.readFileSync(
      path.join(__dirname, '../backend/migrations/create_auth_tables.sql'),
      'utf8'
    );

    // Execute the exec_sql function
    console.log('Creating exec_sql function...');
    const { error: execError } = await supabase.rpc('exec_sql', {
      sql: execSql
    });
    if (execError) {
      console.error('Error creating exec_sql function:', execError);
      throw execError;
    }

    // Execute the create_auth_tables.sql
    console.log('Creating auth tables...');
    const { error: authError } = await supabase.rpc('exec_sql', {
      sql: createAuthTables
    });
    if (authError) {
      console.error('Error creating auth tables:', authError);
      throw authError;
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigration();
