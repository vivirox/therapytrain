import { AccessibilityProvider } from '@/contexts/accessibility-context';
import { KeyboardNavigationProvider } from '@/contexts/keyboard-navigation';
import { RTLProvider } from '@/lib/i18n/rtl-context';
import { SkipLinks } from '@/components/ui/skip-links';
import { ColorBlindFilters } from '@/components/ui/color-blind-filters';
import { Toaster } from 'react-hot-toast';
import { ServiceWorkerUpdater } from '../components/ServiceWorkerUpdater';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { ThemeToggle } from '@/components/theme/theme-toggle';

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
        <ThemeProvider defaultTheme="system" storageKey="ui-theme">
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
                <header id="main-header" role="banner" className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 dark-glass dark-shadow">
                  <div className="flex items-center gap-4">
                    {/* Logo/branding */}
                  </div>
                  <div className="flex items-center gap-2">
                    <ThemeToggle />
                  </div>
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
        </ThemeProvider>
        <Toaster />
        <ServiceWorkerUpdater />
        <OfflineIndicator />
      </body>
    </html>
  );
} 