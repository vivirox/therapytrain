import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

async function runMigration() {
  try {
    // Read the migration file
    const sql = readFileSync(
      join(__dirname, '../backend/migrations/create_auth_tables.sql'),
      'utf8'
    );

    // Split into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Execute each statement through the SQL editor
    for (const statement of statements) {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Prefer': 'params=single-object'
        },
        body: JSON.stringify({
          type: 'sql.execute',
          source: statement
        })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Failed to execute statement:', statement);
        console.error('Error:', text);
        throw new Error(`Failed to execute statement: ${text}`);
      }
    }
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigration();
