import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { inject } from '@vercel/analytics';
import { ErrorBoundary } from 'react-error-boundary';
import { VercelFeedbackWrapper } from '@/components/ui/vercel-feedback';
import { DevTools } from '@/components/dev/DevTools';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { BrowserRouter } from 'react-router-dom';
import { AccessibilityProvider } from '@/contexts/accessibility-context';
import { KeyboardNavigationProvider } from '@/contexts/keyboard-navigation';

// Create root before any React component initialization
const root = ReactDOM.createRoot(document.getElementById('root')!);

// Ensure React is initialized before rendering
const AppWithErrorBoundary: React.FC = () => {
  useEffect(() => {
    // Inject analytics manually
    inject({
      mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      debug: process.env.NODE_ENV === 'development',
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
        onError={(error: unknown, errorInfo: unknown) => {
          console.error('Error caught by boundary:', error, errorInfo);
        }}
      >
        <BrowserRouter>
          <ThemeProvider>
            <AccessibilityProvider>
              <KeyboardNavigationProvider>
                <AuthProvider>
                  <DevTools ></DevTools>
                  <App ></App>
                  <VercelFeedbackWrapper ></VercelFeedbackWrapper>
                  <Analytics debug={process.env.NODE_ENV === 'development'} ></Analytics>
                  <SpeedInsights ></SpeedInsights>
                </AuthProvider>
              </KeyboardNavigationProvider>
            </AccessibilityProvider>
          </ThemeProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

// Render after everything is initialized
root.render(<AppWithErrorBoundary ></AppWithErrorBoundary>);