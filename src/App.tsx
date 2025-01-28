import React, { lazy, Suspense } from "react";
import { ToastProvider } from "./components/ui/toast"; 
import { TooltipProvider } from "./components/ui/tooltip";
import { Loading } from "./components/ui/loading";
import { AuthProvider } from "./components/auth/AuthProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Suspense fallback={<div>Loading...</div>}>
          <TooltipProvider>
            <BrowserRouter>
              <AuthProvider>
                <Suspense fallback={<Loading fullScreen message="Loading TherapyTrain..." />}>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/features" element={<Features />} />
                    <Route path="/benefits" element={<Benefits />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms-of-service" element={<TermsOfService />} />
                    <Route path="/auth" element={<Auth />} />

                    {/* Protected Routes */}
                    <Route 
                      path="/dashboard" 
                      element={
                        <AuthGuard>
                          <Dashboard />
                        </AuthGuard>
                      } 
                    />
                    <Route path="/chat" element={
                      <AuthGuard>
                        <Chat />
                      </AuthGuard>
                    } />
                    <Route path="/education" element={
                      <AuthGuard>
                        <Education />
                      </AuthGuard>
                    } />
                    <Route path="/client-selection" element={
                      <AuthGuard>
                        <ClientSelection />
                      </AuthGuard>
                    } />

                    {/* Catch-all redirect */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                    <Route
                      path="/callback"
                      element={
                        <Navigate
                          to="/dashboard"
                          replace={true}
                        />
                      }
                    />
                  </Routes>
                </Suspense>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </Suspense>
      </ToastProvider>
    </QueryClientProvider>
  );
};export default App;