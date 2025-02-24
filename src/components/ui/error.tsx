import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, XCircle, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent } from './card';

interface ErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: string;
  variant?: 'error' | 'warning' | 'info';
  action?: React.ReactNode;
}

const variantMap = {
  error: {
    icon: XCircle,
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    text: 'text-yellow-500',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-500',
  },
};

export const Error: React.FC<ErrorProps> = ({
  title,
  message,
  variant = 'error',
  action,
  className,
  ...props
}) => {
  const { icon: Icon, bg, border, text } = variantMap[variant];

  return (
    <Card
      className={cn(
        bg,
        border,
        text,
        'border',
        className
      )}
      {...props}
    >
      <CardContent className="flex items-start gap-4 p-4">
        <Icon className="w-5 h-5 mt-0.5" />
        <div className="flex-1">
          {title && (
            <h4 className="font-medium mb-1">{title}</h4>
          )}
          <p className="text-sm opacity-90">{message}</p>
          {action && (
            <div className="mt-4">{action}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 