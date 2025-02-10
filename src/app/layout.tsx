import { AccessibilityProvider } from '@/contexts/accessibility-context';
import { KeyboardNavigationProvider } from '@/contexts/keyboard-navigation';
import { SkipLinks } from '@/components/ui/skip-links';

// ... existing imports ...

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <AccessibilityProvider>
          <KeyboardNavigationProvider>
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
      </body>
    </html>
  );
} 