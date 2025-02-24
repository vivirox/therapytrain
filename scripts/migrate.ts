import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
async function runMigration() {
    try {
        // Path to the migration file
        const migrationPath = join(__dirname, '../backend/migrations/create_auth_tables.sql');
        // Run the migration using Supabase CLI
        console.log('Running migration...');
        execSync(`supabase db reset --db-url ${process.env.DATABASE_URL}`, {
            stdio: 'inherit'
        });
        console.log('Migration completed successfully');
    }
    catch (error) {
        console.error('Error running migrations:', error);
        process.exit(1);
    }
}
runMigration();
