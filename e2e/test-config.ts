import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __rootDir = path.resolve(__dirname, '..');

// Test configuration
export const TEST_CONFIG = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
  },
  test: {
    userEmail: process.env.TEST_USER_EMAIL || 'test@example.com',
    userPassword: process.env.TEST_USER_PASSWORD || 'TestP@ssword123'
  },
  server: {
    port: process.env.PORT || 3001,
    baseUrl: process.env.BASE_URL || 'http://localhost:3001'
  },
  paths: {
    root: __rootDir,
    fixtures: path.resolve(__dirname, 'fixtures'),
    auth: path.resolve(__rootDir, 'playwright', '.auth'),
    authState: path.resolve(__rootDir, 'playwright', '.auth', 'user.json'),
  }
}; 