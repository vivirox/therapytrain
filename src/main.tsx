import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { ErrorBoundary } from 'react-error-boundary';
import { VercelFeedbackWrapper } from './components/ui/vercel-feedback';

// Lazy load analytics components to handle blocking gracefully
const Analytics = React.lazy(() => import('@vercel/analytics/react').then(mod => ({
  default: mod.Analytics
})));

const SpeedInsights = React.lazy(() => import('@vercel/speed-insights/react').then(mod => ({
  default: mod.SpeedInsights
})));

// Fallback component for analytics when blocked or loading
const AnalyticsFallback = () => null;

// Create root before any React component initialization
const root = ReactDOM.createRoot(document.getElementById('root')!);

// Analytics error boundary to prevent app crashes
const AnalyticsErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary 
    fallback={<AnalyticsFallback />}
    onError={(error) => {
      console.debug('Analytics failed to load:', error);
    }}
  >
    {children}
  </ErrorBoundary>
);

// Ensure React is initialized before rendering
const AppWithErrorBoundary = () => (
  <React.StrictMode>
    <ErrorBoundary 
      fallback={<div>Something went wrong</div>}
      onError={(error, errorInfo) => {
        console.error('Error caught by boundary:', error, errorInfo);
      }}
    >
      <App />
      <VercelFeedbackWrapper />
      <Suspense fallback={<AnalyticsFallback />}>
        <AnalyticsErrorBoundary>
          <Analytics
            beforeSend={(event) => {
              if (event.type === 'pageview' || event.type === 'event') {
                return event;
              }
              return null;
            }}
            debug={false}
          />
        </AnalyticsErrorBoundary>
      </Suspense>
      <Suspense fallback={<AnalyticsFallback />}>
        <AnalyticsErrorBoundary>
          <SpeedInsights />
        </AnalyticsErrorBoundary>
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>
);

// Render after everything is initialized
root.render(<AppWithErrorBoundary />);