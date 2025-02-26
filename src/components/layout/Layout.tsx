import React from 'react';
import Link from "next/link";
import { useRouter } from "next/router";
import { MdPsychology } from "react-icons/md";
import { cn } from '@/lib/utils';
import { ThemeToggle } from '../ThemeToggle';
import { useTheme } from '../ThemeProvider';

interface LayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, className, ...props }) => {
  const navigate = useRouter();
  const { reducedMotion } = useTheme();
  const docsBaseUrl = process.env.NODE_ENV === 'production' ? '/docs' : 'http://localhost:3001';

  return (
    <>
      {/* Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-background focus:text-foreground focus:rounded-md focus:shadow-lg dark-focus-ring"
      >
        Skip to main content
      </a>

      {/* Main Layout */}
      <div
        className={cn(
          'min-h-screen flex flex-col bg-background',
          !reducedMotion && 'theme-switch-transition',
          className
        )}
        {...props}
      >
        {/* Navigation */}
        <nav className="border-b border-border/50 dark-glass">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <Link to="/" className="flex items-center">
                  <MdPsychology className="h-8 w-8 text-primary" />
                  <span className="ml-2 text-xl font-bold text-foreground">Gradiant</span>
                </Link>
              </div>
              <div className="hidden md:flex items-center space-x-8">
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors dark-hover">Home</Link>
                <Link to="/features" className="text-muted-foreground hover:text-foreground transition-colors dark-hover">Features</Link>
                <Link to="/benefits" className="text-muted-foreground hover:text-foreground transition-colors dark-hover">Benefits</Link>
                <div className="relative group">
                  <a 
                    href={`${docsBaseUrl}/introduction`}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-muted-foreground hover:text-foreground transition-colors flex items-center group dark-hover"
                  >
                    Documentation
                    <svg 
                      className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                      />
                    </svg>
                  </a>
                  <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg dark-glass ring-1 ring-border/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-1">
                      <a
                        href={`${docsBaseUrl}/quickstart`}
                        className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground dark-hover"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Quickstart Guide
                      </a>
                      <a
                        href={`${docsBaseUrl}/api-reference/introduction`}
                        className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground dark-hover"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        API Reference
                      </a>
                      <a
                        href={`${docsBaseUrl}/core/architecture`}
                        className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground dark-hover"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Core Concepts
                      </a>
                    </div>
                  </div>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main
          id="main-content"
          className={cn(
            'flex-1',
            !reducedMotion && 'theme-content-transition'
          )}
          role="main"
          aria-label="Main content"
        >
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-border/50 dark-glass py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center mb-4 md:mb-0">
                <Link to="/" className="flex items-center">
                  <MdPsychology className="h-6 w-6 text-primary" />
                  <span className="ml-2 text-lg font-bold text-foreground">Gradiant</span>
                </Link>
              </div>
              <div className="flex flex-wrap justify-center space-x-6 text-sm text-muted-foreground">
                <Link to="/" className="hover:text-foreground transition-colors dark-hover">Home</Link>
                <Link to="/features" className="hover:text-foreground transition-colors dark-hover">Features</Link>
                <Link to="/benefits" className="hover:text-foreground transition-colors dark-hover">Benefits</Link>
                <Link to="/privacy" className="hover:text-foreground transition-colors dark-hover">Privacy Policy</Link>
                <Link to="/terms" className="hover:text-foreground transition-colors dark-hover">Terms of Service</Link>
                <a 
                  href={`${docsBaseUrl}/introduction`}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-foreground transition-colors flex items-center dark-hover"
                >
                  Documentation
                  <svg 
                    className="w-3 h-3 ml-1" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                    />
                  </svg>
                </a>
              </div>
            </div>
            <div className="mt-8 text-center text-sm text-muted-foreground">
              <p>© 2024 Gradiant. All rights reserved.</p>
              <p className="mt-2">HIPAA Compliant | Secure | Confidential</p>
            </div>
          </div>
        </footer>

        {/* Accessibility Announcer for Dynamic Content */}
        <div
          role="status"
          aria-live="polite"
          className="sr-only"
        />
      </div>
    </>
  );
}; 