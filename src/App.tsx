import React, { lazy, Suspense } from "react";
import { ToastProvider } from "./components/ui/toast"; 
import { TooltipProvider } from "./components/ui/tooltip";
import { Loading } from "./components/ui/loading";
import { AuthProvider, ProtectedRoute } from "./components/auth/AuthProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
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
              <Suspense fallback={<Loading fullScreen message="Loading TherapyTrain..." />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/chat" element={<AuthProvider><ProtectedRoute><Chat /></ProtectedRoute></AuthProvider>} />
                  <Route path="/education" element={<AuthProvider><ProtectedRoute><Education /></ProtectedRoute></AuthProvider>} />
                  <Route path="/clients" element={<AuthProvider><ProtectedRoute><ClientSelection /></ProtectedRoute></AuthProvider>} />
                  <Route path="/features" element={<Features />} />
                  <Route path="/benefits" element={<Benefits />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </Suspense>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
