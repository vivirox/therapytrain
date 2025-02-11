/** @jsxImportSource @emotion/react */
import { type FC } from 'react';
import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Loading } from '@/components/ui/loading';
import { Layout } from '@/components/layout/Layout';
import { MDXProvider } from '@mdx-js/react';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Lazy load components
const Index = lazy(() => import("./pages/Index"));
const Features = lazy(() => import("./pages/Features"));
const Benefits = lazy(() => import("./pages/Benefits"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const NotFound: FC = () => <h1>404 - Page Not Found</h1>;

const components = {
  h1: (props: any) => <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white" {...props} />,
  h2: (props: any) => <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100" {...props} />,
  h3: (props: any) => <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-gray-100" {...props} />,
  p: (props: any) => <p className="mb-4 text-gray-700 dark:text-gray-300" {...props} />,
  a: (props: any) => <a className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300" {...props} />,
  ul: (props: any) => <ul className="list-disc pl-5 mb-4 text-gray-700 dark:text-gray-300" {...props} />,
  ol: (props: any) => <ol className="list-decimal pl-5 mb-4 text-gray-700 dark:text-gray-300" {...props} />,
  li: (props: any) => <li className="mb-2" {...props} />,
  strong: (props: any) => <strong className="font-bold text-gray-900 dark:text-white" {...props} />,
  // Add our UI components
  Card,
  ProgressBar,
  Checkbox,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
};

const App: FC = () => {
  return (
    <MDXProvider components={components}>
      <Suspense fallback={<Loading />}>
        <Layout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/features" element={<Features />} />
            <Route path="/benefits" element={<Benefits />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/admin/*" element={<AdminDashboard />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </Suspense>
    </MDXProvider>
  );
};

export default App;
