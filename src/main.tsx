import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ErrorBoundary } from 'react-error-boundary';
import { VercelFeedbackWrapper } from './components/ui/vercel-feedback';

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
      <Analytics
        beforeSend={(event) => {
          // Filter out non-error events if needed
          if (event.type === 'error' && !event.data) {
            return null;
          }
          return event;
        }}
      />
      <SpeedInsights />
    </ErrorBoundary>
  </React.StrictMode>
);

// Render after everything is initialized
root.render(<AppWithErrorBoundary />);