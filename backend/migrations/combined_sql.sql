-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum type for difficulty levels
DO $$ 
BEGIN
  CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create tutorials table
CREATE TABLE IF NOT EXISTS tutorials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty difficulty_level NOT NULL,
  duration INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tutorials_category ON tutorials(category);
CREATE INDEX IF NOT EXISTS idx_tutorials_difficulty ON tutorials(difficulty);

-- Enable RLS
ALTER TABLE tutorials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ 
BEGIN
  -- Allow read access to all authenticated users
  CREATE POLICY "Allow read access to all authenticated users"
    ON tutorials FOR SELECT
    TO authenticated
    USING (true);

  -- Allow full access to service role
  CREATE POLICY "Allow full access to service role"
    ON tutorials FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS update_tutorials_updated_at ON tutorials;
CREATE TRIGGER update_tutorials_updated_at
    BEFORE UPDATE ON tutorials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO tutorials (title, description, content, category, difficulty, duration)
VALUES 
  (
    'Getting Started with Therapy',
    'Learn the fundamentals of therapeutic practice',
    'This tutorial covers the basic principles and approaches in therapy...',
    'fundamentals',
    'beginner',
    30
  ),
  (
    'Advanced Intervention Techniques',
    'Master complex therapeutic interventions',
    'Explore advanced techniques for challenging client situations...',
    'techniques',
    'advanced',
    45
  );
