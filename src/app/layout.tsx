import { AccessibilityProvider } from '@/contexts/accessibility-context';
import { KeyboardNavigationProvider } from '@/contexts/keyboard-navigation';
import { RTLProvider } from '@/lib/i18n/rtl-context';
import { SkipLinks } from '@/components/ui/skip-links';
import { ColorBlindFilters } from '@/components/ui/color-blind-filters';
import { Toaster } from 'react-hot-toast';
import { ServiceWorkerUpdater } from '../components/ServiceWorkerUpdater';
import { OfflineIndicator } from '../components/OfflineIndicator';

// ... existing imports ...

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4a90e2" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Gradiant" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <RTLProvider>
          <AccessibilityProvider>
            <KeyboardNavigationProvider>
              <ColorBlindFilters />
              <SkipLinks
                links={[
                  { label: 'Skip to main content', target: 'main-content' },
                  { label: 'Skip to navigation', target: 'main-nav' },
                  { label: 'Skip to footer', target: 'main-footer' },
                ]}
              />
              {/* Add main landmarks */}
              <header id="main-header" role="banner">
                {/* Header content */}
              </header>
              <nav id="main-nav" role="navigation" aria-label="Main navigation">
                {/* Navigation content */}
              </nav>
              <main id="main-content" role="main" tabIndex={-1}>
                {children}
              </main>
              <footer id="main-footer" role="contentinfo">
                {/* Footer content */}
              </footer>
            </KeyboardNavigationProvider>
          </AccessibilityProvider>
        </RTLProvider>
        <Toaster />
        <ServiceWorkerUpdater />
        <OfflineIndicator />
      </body>
    </html>
  );
} 