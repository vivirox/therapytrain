import React, { useEffect } from 'react';

export const DevTools: React.FC = () => {
  useEffect(() => {
    // Only load in development
    if (process.env.NODE_ENV === 'development') {
      const script = document.createElement('script');
      script.src = 'http://localhost:8097';
      script.async = true;
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, []);

  return null;
}; 