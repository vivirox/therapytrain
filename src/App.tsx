/** @jsxImportSource @emotion/react */
import { type FC } from 'react';
import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Loading } from "./components/ui/loading";
import { Layout } from "./components/layout/Layout";

// Lazy load components
const Index = lazy(() => import("./pages/Index"));
const Features = lazy(() => import("./pages/Features"));
const Benefits = lazy(() => import("./pages/Benefits"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));

const ROUTES = {
  HOME: '/',
  FEATURES: '/features',
  BENEFITS: '/benefits',
  PRIVACY_POLICY: '/privacy-policy',
  TERMS_OF_SERVICE: '/terms-of-service',
} as const;

const NotFound: FC = () => <h1>404 - Page Not Found</h1>;

const AppRoutes: FC = () => {
  return (
    <Suspense fallback={<Loading />}>
      <Layout>
        <Routes>
          <Route path={ROUTES.HOME} element={<Index />} />
          <Route path={ROUTES.FEATURES} element={<Features />} />
          <Route path={ROUTES.BENEFITS} element={<Benefits />} />
          <Route path={ROUTES.PRIVACY_POLICY} element={<PrivacyPolicy />} />
          <Route path={ROUTES.TERMS_OF_SERVICE} element={<TermsOfService />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </Suspense>
  );
};

const App: FC = () => {
  return (
    <Router>
      <Suspense fallback={<Loading fullScreen message="Loading TherapyTrain..." />}>
        <AppRoutes />
      </Suspense>
    </Router>
  );
};

export { App as default };
