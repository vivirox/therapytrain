import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive:
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        success:
          'border-success/50 text-success dark:border-success [&>svg]:text-success',
        warning:
          'border-warning/50 text-warning dark:border-warning [&>svg]:text-warning',
        info:
          'border-info/50 text-info dark:border-info [&>svg]:text-info'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

const alertTitleVariants = cva('mb-1 font-medium leading-none tracking-tight', {
  variants: {
    variant: {
      default: 'text-foreground',
      destructive: 'text-destructive dark:text-destructive',
      success: 'text-success dark:text-success',
      warning: 'text-warning dark:text-warning',
      info: 'text-info dark:text-info'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});

const alertDescriptionVariants = cva('text-sm [&_p]:leading-relaxed', {
  variants: {
    variant: {
      default: 'text-muted-foreground',
      destructive: 'text-destructive dark:text-destructive',
      success: 'text-success dark:text-success',
      warning: 'text-warning dark:text-warning',
      info: 'text-info dark:text-info'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});

interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, title, description, icon, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        {icon}
        {title && (
          <h5 className={cn(alertTitleVariants({ variant }))}>
            {title}
          </h5>
        )}
        {description && (
          <div className={cn(alertDescriptionVariants({ variant }))}>
            {description}
          </div>
        )}
        {children}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export { Alert, alertVariants }; 