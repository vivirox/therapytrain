#!/usr/bin/env node

// Disable punycode warning
process.removeAllListeners('warning');

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Define tutorial interface
interface Tutorial {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  created_at: string;
  updated_at: string;
}

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

class TutorialsDB {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async createTutorial(tutorial: Partial<Tutorial>) {
    const { data, error } = await this.supabase
      .from('tutorials')
      .insert([tutorial])
      .select();

    if (error) {
      throw error;
    }
    return data;
  }

  async listTutorials(): Promise<Array<Tutorial>> {
    const { data, error } = await this.supabase
      .from('tutorials')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }
    return data || [];
  }

  async deleteDuplicates() {
    const tutorials = await this.listTutorials();
    const seen = new Set<string>();
    const duplicates = tutorials.filter((t: Tutorial) => {
      const key = `${t.title}-${t.category}`;
      if (seen.has(key)) {
        return true;
      }
      seen.add(key);
      return false;
    });

    if (duplicates.length > 0) {
      const ids = duplicates.map((d: Tutorial) => d.id);
      const { error } = await this.supabase
        .from('tutorials')
        .delete()
        .in('id', ids);

      if (error) {
        throw error;
      }
      console.log(`Deleted ${duplicates.length} duplicate tutorials`);
    }
  }

  async displayTutorials() {
    const tutorials = await this.listTutorials();
    console.log(`\nFound ${tutorials.length} tutorials:`);
    
    tutorials.forEach((tutorial: Tutorial, index: number) => {
      console.log(`\nTutorial ${index + 1}:`);
      console.log('- Title:', tutorial.title);
      console.log('- Description:', tutorial.description);
      console.log('- Category:', tutorial.category);
      console.log('- Difficulty:', tutorial.difficulty);
      console.log('- Duration:', tutorial.duration, 'minutes');
      console.log('- Created:', new Date(tutorial.created_at).toLocaleString());
    });
  }
}

async function main() {
  try {
    console.log('Initializing Tutorials DB...');
    const db = new TutorialsDB();

    // Clean up duplicates
    console.log('Cleaning up duplicate entries...');
    await db.deleteDuplicates();

    // Display current tutorials
    console.log('Current tutorials in database:');
    await db.displayTutorials();

  } catch (error) {
    console.error('Error:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

// Run the script
main();
