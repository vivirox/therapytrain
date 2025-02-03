
import styled from 'styled-components';
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, useRoutes } from 'react-router-dom';
import { ToastProvider } from "./components/ui/toast";
import { TooltipProvider } from "./components/ui/tooltip";
import { Loading } from "./components/ui/loading";
import { AuthProvider } from "./components/auth/AuthProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGuard } from "./components/AuthGuard";
import { Text } from 'react-native-web';
import { supabase } from './lib/supabase';



const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Chat = lazy(() => import("./pages/Chat"));
const Education = lazy(() => import("./pages/Education"));
const ClientSelection = lazy(() => import("./pages/ClientSelection"));
const Features = lazy(() => import("./pages/Features"));
const Benefits = lazy(() => import("./pages/Benefits"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));

const Container = styled.div`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const Header = styled.h1`
  font-size: 24px;
  margin-bottom: 20px;
`;

const TodoItem = styled.li`
  font-size: 18px;
  padding: 10px;
`;

function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

const AppRoutes = () => {
  const routes = [
    { path: "/", element: <Index /> },
    { path: "/features", element: <Features /> },
    { path: "/benefits", element: <Benefits /> },
    { path: "/privacy-policy", element: <PrivacyPolicy /> },
    { path: "/terms-of-service", element: <TermsOfService /> },
    { path: "/auth", element: <Auth /> },
    { path: "/login", element: <Auth /> },
    { path: "/callback", element: <Navigate to="/dashboard" replace /> },
    { path: "/dashboard", element: <AuthGuard><Dashboard /></AuthGuard> },
    { path: "/chat", element: <AuthGuard><Chat /></AuthGuard> },
    { path: "/education", element: <AuthGuard><Education /></AuthGuard> },
    { path: "/client-selection", element: <AuthGuard><ClientSelection /></AuthGuard> },
  ];
  return useRoutes(routes);
};

const App: React.FC = () => {
  return (
    <Container>
      return (
      <QueryProvider>
        <ToastProvider>
          <TooltipProvider>
            <BrowserRouter>
              <AuthProvider>
                <Suspense fallback={<Loading fullScreen message="Loading TherapyTrain..." />}>
                  <AppRoutes />
                </Suspense>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </ToastProvider>
      </QueryProvider>
    </Container>
  )
}

export { App as default };
