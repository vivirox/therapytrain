import { ReactNode } from 'react';

export default function SentryExampleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="sentry-example">
      {children}
    </div>
  );
} 