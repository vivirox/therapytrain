import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { inject } from '@vercel/analytics';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { DevTools } from '@/components/dev/DevTools';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { AccessibilityProvider } from '@/contexts/accessibility-context';
import { KeyboardNavigationProvider } from '@/contexts/keyboard-navigation';

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert" className="p-4">
      <h2 className="text-lg font-semibold text-red-600">Something went wrong:</h2>
      <pre className="mt-2 text-sm text-red-500">{error.message}</pre>
      <button
        onClick={resetErrorBoundary}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}

// Create root before any React component initialization
const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ThemeProvider>
        <AuthProvider>
          <AccessibilityProvider>
            <KeyboardNavigationProvider>
              <App />
              <Analytics />
              <SpeedInsights />
              {process.env.NODE_ENV === 'development' && <DevTools />}
            </KeyboardNavigationProvider>
          </AccessibilityProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);