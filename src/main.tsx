import React from 'react'
import ReactDOM from 'react-dom/client'
import { IconContext } from 'react-icons'
import App from './App'
import './styles/globals.css'
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ErrorBoundary } from 'react-error-boundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <IconContext.Provider value={{ className: 'react-icons' }}>
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <App />
        <Analytics />
        <SpeedInsights />
      </ErrorBoundary>
    </IconContext.Provider>
  </React.StrictMode>
)