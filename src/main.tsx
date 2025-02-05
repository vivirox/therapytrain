import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { ErrorBoundary } from 'react-error-boundary';
import { VercelFeedbackWrapper } from './components/ui/vercel-feedback';
import { AnalyticsWrapper } from './components/analytics/AnalyticsWrapper';

// Create root before any React component initialization
const root = ReactDOM.createRoot(document.getElementById('root')!);

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
      <AnalyticsWrapper 
        onError={(error) => {
          // Silently handle analytics errors
          console.debug('Analytics error:', error);
        }}
      />
    </ErrorBoundary>
  </React.StrictMode>
);

// Render after everything is initialized
root.render(<AppWithErrorBoundary />);