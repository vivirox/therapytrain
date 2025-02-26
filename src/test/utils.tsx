import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { AccessibilityProvider } from '@/contexts/accessibility-context';
import { KeyboardNavigationProvider } from '@/contexts/keyboard-navigation';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AccessibilityProvider>
          <KeyboardNavigationProvider>
            {children}
          </KeyboardNavigationProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

const customRender = (ui: React.ReactElement, options = {}) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render };
