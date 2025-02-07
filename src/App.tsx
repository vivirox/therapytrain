/** @jsxImportSource @emotion/react */
import { type FC } from 'react';
import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Loading } from "./components/ui/loading";
import { Layout } from "./components/layout/Layout";

// Lazy load components
const Index = lazy(() => import("./pages/Index"));
const Features = lazy(() => import("./pages/Features"));
const Benefits = lazy(() => import("./pages/Benefits"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));

const NotFound: FC = () => <h1>404 - Page Not Found</h1>;

const App: FC = () => {
  return (
    <Suspense fallback={<Loading fullScreen message="Loading TherapyTrain..." />}>
      <Layout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/features" element={<Features />} />
          <Route path="/benefits" element={<Benefits />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </Suspense>
  );
};

export { App as default };
