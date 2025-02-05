import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ErrorBoundary } from 'react-error-boundary';

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
      <Analytics />
      <SpeedInsights />
    </ErrorBoundary>
  </React.StrictMode>
);

// Render after everything is initialized
root.render(<AppWithErrorBoundary />);