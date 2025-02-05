/** @jsxImportSource @emotion/react */
import React from 'react';
import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { ToastProvider } from "./components/ui/toast";
import { TooltipProvider } from "./components/ui/tooltip";
import { Loading } from "./components/ui/loading";
import { AuthProvider } from "./components/auth/AuthProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGuard } from "./components/AuthGuard";

// Lazy load components
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

interface QueryProviderProps {
  children: React.ReactNode;
}

function QueryProvider({ children }: QueryProviderProps) {
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

interface ProtectedRouteProps {
  component: React.ComponentType;
  path: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component }) => {
  return (
    <AuthGuard>
      <Component />
    </AuthGuard>
  );
};

const AppRoutes = () => {
  const navigate = useNavigate();

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path={ROUTES.HOME} element={<Index />} />
        <Route path={ROUTES.FEATURES} element={<Features />} />
        <Route path={ROUTES.BENEFITS} element={<Benefits />} />
        <Route path={ROUTES.PRIVACY_POLICY} element={<PrivacyPolicy />} />
        <Route path={ROUTES.TERMS_OF_SERVICE} element={<TermsOfService />} />
        <Route path={ROUTES.AUTH} element={<Auth />} />
        <Route path={ROUTES.LOGIN} element={<Auth />} />
        <Route
          path={ROUTES.DASHBOARD}
          element={<ProtectedRoute component={Dashboard} path={ROUTES.DASHBOARD} />}
        />
        <Route
          path={ROUTES.CHAT}
          element={<ProtectedRoute component={Chat} path={ROUTES.CHAT} />}
        />
        <Route
          path={ROUTES.EDUCATION}
          element={<ProtectedRoute component={Education} path={ROUTES.EDUCATION} />}
        />
        <Route
          path={ROUTES.CLIENT_SELECTION}
          element={<ProtectedRoute component={ClientSelection} path={ROUTES.CLIENT_SELECTION} />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => {
  return (
    <QueryProvider>
      <ToastProvider>
        <TooltipProvider>
          <AuthProvider>
            <Router>
              <Suspense fallback={<Loading fullScreen message="Loading TherapyTrain..." />}>
                <AppRoutes />
              </Suspense>
            </Router>
          </AuthProvider>
        </TooltipProvider>
      </ToastProvider>
    </QueryProvider>
  );
};

export { App as default };
