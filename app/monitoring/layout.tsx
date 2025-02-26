import { ReactNode } from 'react';

export default function MonitoringLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="monitoring-layout">
      {children}
    </div>
  );
} 