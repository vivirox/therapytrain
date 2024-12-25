-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kv_data ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can only access their own profile"
ON profiles FOR ALL
USING (auth.uid() = id);

CREATE POLICY "Authorized access to client profiles"
ON client_profiles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'therapist'
  )
);
