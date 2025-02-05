import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { inject } from '@vercel/analytics';
import { ErrorBoundary } from 'react-error-boundary';
import { VercelFeedbackWrapper } from './components/ui/vercel-feedback';

// Create root before any React component initialization
const root = ReactDOM.createRoot(document.getElementById('root')!);

// Ensure React is initialized before rendering
const AppWithErrorBoundary = () => {
  useEffect(() => {
    // Inject analytics manually
    inject({
      mode: 'production',
      debug: true, // Enable debug mode to see what's happening
      beforeSend: (event: any) => {
        // Only allow pageview and custom events
        if (event.type === 'pageview' || event.type === 'event') {
          return event;
        }
        return null;
      },
    });
  }, []);

  return (
    <React.StrictMode>
      <ErrorBoundary 
        fallback={<div>Something went wrong</div>}
        onError={(error, errorInfo) => {
          console.error('Error caught by boundary:', error, errorInfo);
        }}
      >
        <App />
        <VercelFeedbackWrapper />
        <Analytics debug={true} />
        <SpeedInsights />
      </ErrorBoundary>
    </React.StrictMode>
  );
};

// Render after everything is initialized
root.render(<AppWithErrorBoundary />);