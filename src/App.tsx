/** @jsxImportSource @emotion/react */
import React from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/layout/Layout';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/context/authcontext';

// Pages
import Home from '@/pages/Home';
import Education from '@/pages/Education';
import Unauthorized from '@/pages/Unauthorized';
import ClientProfiles from '@/pages/ClientProfiles';
import Evaluation from '@/pages/Evaluation';

const App: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();

  // Define routes and their components
  const routes = {
    '/': <Home />,
    '/education': <Education />,
    '/unauthorized': <Unauthorized />,
    '/client-profiles': <ClientProfiles />,
    '/evaluation': <Evaluation />
  };

  // Get the current route component
  const Component = routes[router.pathname as keyof typeof routes];

  return (
    <Layout>
      {Component ? (
        router.pathname === '/unauthorized' ? (
          Component
        ) : (
          <AuthGuard>{Component}</AuthGuard>
        )
      ) : (
        <div>404 - Page not found</div>
      )}
    </Layout>
  );
};

export default App;
