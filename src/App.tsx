/** @jsxImportSource @emotion/react */
import { type FC } from 'react';
import { Suspense, lazy } from 'react';
import { Outlet } from 'react-router-dom';
import { Loading } from "./components/ui/loading";
import { Layout } from "./components/layout/Layout";

// Lazy load components
const Index = lazy(() => import("./pages/Index"));
const Features = lazy(() => import("./pages/Features"));
const Benefits = lazy(() => import("./pages/Benefits"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));

export const routes = [
  {
    path: '/',
    element: <Index />,
  },
  {
    path: '/features',
    element: <Features />,
  },
  {
    path: '/benefits',
    element: <Benefits />,
  },
  {
    path: '/privacy-policy',
    element: <PrivacyPolicy />,
  },
  {
    path: '/terms-of-service',
    element: <TermsOfService />,
  },
];

const App: FC = () => {
  return (
    <Suspense fallback={<Loading fullScreen message="Loading TherapyTrain..." />}>
      <Layout>
        <Outlet />
      </Layout>
    </Suspense>
  );
};

export { App as default };
