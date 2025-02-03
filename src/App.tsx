/** @jsxImportSource @emotion/react */
import React from 'react';
import styled from 'styled-components';
import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ToastProvider } from "./components/ui/toast";
import { TooltipProvider } from "./components/ui/tooltip";
import { Loading } from "./components/ui/loading";
import { AuthProvider } from "./components/auth/AuthProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGuard } from "./components/AuthGuard";
import { useAuth } from "./components/auth/AuthProvider";
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Chat = lazy(() => import("./pages/Chat"));
const Education = lazy(() => import("./pages/Education"));
const ClientSelection = lazy(() => import("./pages/ClientSelection"));
const Features = lazy(() => import("./pages/Features"));
const Benefits = lazy(() => import("./pages/Benefits"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));

function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

const ROUTES = {
  HOME: '/',
  FEATURES: '/features',
  BENEFITS: '/benefits',
  PRIVACY_POLICY: '/privacy-policy',
  TERMS_OF_SERVICE: '/terms-of-service',
  AUTH: '/auth',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  CHAT: '/chat',
  EDUCATION: '/education',
  CLIENT_SELECTION: '/client-selection'
} as const;

const NotFound = () => <h1>404 - Page Not Found</h1>;

const ProtectedRoute = ({ component: Component, ...rest }) => (
  <Route {...rest} element={
    <AuthGuard>
      <Component />
    </AuthGuard>
  } />
);

const AppRoutes = () => {
  const handleRoute = (e: { url: string }) => {
    if (e.url === '/callback') {
      route('/dashboard', true);
    }
  };

  return (
    <Router>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path={ROUTES.HOME} element={<div>Home</div>} />
          <Route path={ROUTES.FEATURES} element={<Features />} />
          <Route path={ROUTES.BENEFITS} element={<Benefits />} />
          <Route path={ROUTES.PRIVACY_POLICY} element={<PrivacyPolicy />} />
          <Route path={ROUTES.TERMS_OF_SERVICE} element={<TermsOfService />} />
          <Route path={ROUTES.AUTH} element={<Auth />} />
          <Route path={ROUTES.LOGIN} element={<Auth />} />
          <Route path={ROUTES.DASHBOARD} element={<ProtectedRoute component={Dashboard} />} />
          <Route path={ROUTES.CHAT} element={<ProtectedRoute component={Chat} />} />
          <Route path={ROUTES.EDUCATION} element={<ProtectedRoute component={Education} />} />
          <Route path={ROUTES.CLIENT_SELECTION} element={<ProtectedRoute component={ClientSelection} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

const App = () => {
  return (
    <QueryProvider>
      <ToastProvider>
        <TooltipProvider>
          <AuthProvider>
            <Suspense fallback={<Loading fullScreen message="Loading TherapyTrain..." />} >
              <AppRoutes />
            </Suspense>
          </AuthProvider>
        </TooltipProvider>
      </ToastProvider>
    </QueryProvider>
  )
}

export { App as default };
