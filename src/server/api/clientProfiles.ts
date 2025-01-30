import { createClient } from '@supabase/supabase-js';
import { type ClientProfile } from '@/types/ClientProfile';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getClientProfiles() {
  const { data: profiles, error } = await supabase
    .from('client_profiles')
    .select('*');

  if (error) {
    throw new Error(`Failed to fetch profiles: ${error.message}`);
  }

  return profiles;
}

export async function getClientProfile(id: number) {
  const { data: profile, error } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  return profile;
}

export async function createClientProfile(profile: Omit<ClientProfile, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('client_profiles')
    .insert([profile])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create profile: ${error.message}`);
  }

  return data;
}

export async function updateClientProfile(
  id: number, 
  profile: Partial<Omit<ClientProfile, 'id' | 'created_at' | 'updated_at'>>
) {
  const { data, error } = await supabase
    .from('client_profiles')
    .update(profile)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  return data;
}

export async function deleteClientProfile(id: number) {
  const { error } = await supabase
    .from('client_profiles')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete profile: ${error.message}`);
  }
}