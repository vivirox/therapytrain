import { createServerSupabaseClient } from '@/lib/supabase/server';
import { type ClientProfile } from '@/types/ClientProfile';

export async function getClientProfiles() {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('client_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getClientProfile(id: number) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createClientProfile(profile: Omit<ClientProfile, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('client_profiles')
    .insert([profile])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateClientProfile(id: number, profile: Partial<Omit<ClientProfile, 'id' | 'created_at' | 'updated_at'>>) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('client_profiles')
    .update(profile)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClientProfile(id: number) {
  const supabase = createServerSupabaseClient();
  
  const { error } = await supabase
    .from('client_profiles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
