import React from 'react';
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from '@/context/authcontext';
import { Loading } from '@/components/ui/loading';
import type { AuthProps } from '@/types';

export const Auth: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If we're on the callback route and authenticated
    if (router.pathname === '/callback' && isAuthenticated) {
      router.replace('/dashboard');
      return;
    }

    // If we're authenticated but on the auth page
    if (router.pathname === '/auth' && isAuthenticated) {
      router.replace('/dashboard');
      return;
    }
  }, [isAuthenticated, router.pathname, router]);

  return <Loading fullScreen message="Processing authentication..." ></Loading>;
};

