import { useKindeAuth } from "@kinde-oss/kinde-auth-react";

const { user, isAuthenticated, isLoading } = useKindeAuth();import { type ClientProfile } from '@/types/ClientProfile';

export async function getClientProfiles() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  
  // Use Kinde Management API to fetch profiles
  const response = await fetch(`${process.env.KINDE_ISSUER_URL}/api/v1/users`, {
    headers: {
      Authorization: `Bearer ${process.env.KINDE_CLIENT_SECRET}`,
    },
  });
  
  const data = await response.json();
  return data.users;
}

export async function getClientProfile(id: number) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  const response = await fetch(`${process.env.KINDE_ISSUER_URL}/api/v1/user/${id}`, {
    headers: {
      Authorization: `Bearer ${process.env.KINDE_CLIENT_SECRET}`,
    },
  });

  return await response.json();
}

export async function createClientProfile(profile: Omit<ClientProfile, 'id' | 'created_at' | 'updated_at'>) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  const response = await fetch(`${process.env.KINDE_ISSUER_URL}/api/v1/user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.KINDE_CLIENT_SECRET}`,
    },
    body: JSON.stringify(profile),
  });

  return await response.json();
}

export async function updateClientProfile(id: number, profile: Partial<Omit<ClientProfile, 'id' | 'created_at' | 'updated_at'>>) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  const response = await fetch(`${process.env.KINDE_ISSUER_URL}/api/v1/user/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.KINDE_CLIENT_SECRET}`,
    },
    body: JSON.stringify(profile),
  });

  return await response.json();
}

export async function deleteClientProfile(id: number) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  const response = await fetch(`${process.env.KINDE_ISSUER_URL}/api/v1/user/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${process.env.KINDE_CLIENT_SECRET}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete profile');
  }
}

function getKindeServerSession(): { getUser: any; } {
  throw new Error("Function not implemented.");
}
