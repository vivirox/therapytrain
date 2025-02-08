import React from 'react';

interface DevToolsProps {
  children?: React.ReactNode;
}

export const DevTools: React.FC<DevToolsProps> = ({ children }) => {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {children}
    </div>
  );
};

export default DevTools; 