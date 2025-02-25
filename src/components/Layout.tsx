import { useEffect, useRef } from 'react';
import { setupGlobalReducedMotionObserver } from '../utils/motion';

export function Layout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Setup global reduced motion observer
    const observer = setupGlobalReducedMotionObserver();
    
    // Cleanup on unmount
    return () => observer.disconnect();
  }, []);

  return (
    <div className="layout">
      {children}
    </div>
  );
} 