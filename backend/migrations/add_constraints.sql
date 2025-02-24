-- Add constraints and indexes to the tutorials table

-- Create enum type for difficulty levels if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty_level') THEN
    CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
  END IF;
END $$;

-- Add constraints
ALTER TABLE tutorials
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN description SET NOT NULL,
  ALTER COLUMN content SET NOT NULL,
  ALTER COLUMN category SET NOT NULL,
  ALTER COLUMN duration SET NOT NULL,
  ADD CONSTRAINT duration_positive CHECK (duration > 0),
  ADD CONSTRAINT title_length CHECK (char_length(title) >= 3),
  ADD CONSTRAINT description_length CHECK (char_length(description) >= 10);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_tutorials_category ON tutorials(category);
CREATE INDEX IF NOT EXISTS idx_tutorials_difficulty ON tutorials(difficulty);

-- Enable Row Level Security
ALTER TABLE tutorials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access to all authenticated users"
  ON tutorials FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow full access to service role"
  ON tutorials FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
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

-- Clean up duplicate data
DELETE FROM tutorials a USING tutorials b
WHERE a.ctid < b.ctid 
AND a.title = b.title 
AND a.category = b.category;
