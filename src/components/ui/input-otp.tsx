import * as React from "react";
import { OTPInput } from "input-otp";
import { cn } from '@/lib/utils';

interface InputOTPProps {
  maxLength: number;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  containerClassName?: string;
}

const InputOTP = React.forwardRef<HTMLInputElement, InputOTPProps>(
  ({ className, containerClassName, maxLength, value, onChange, ...props }, ref) => {
    return (
      <div className={cn("flex items-center gap-2", containerClassName)}>
        <OTPInput
          ref={ref}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          render={({ slots }) => (
            <div className="flex gap-2">
              {slots.map((slot: any, idx: any) => (
                <div key={idx} className={cn("relative", className)}>
                  <input
                    {...slot}
                    className={cn(
                      "h-10 w-10 rounded-md border text-center text-base shadow-sm",
                      "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      className
                    )}
                  />
                </div>
              ))}
            </div>
          )}
          {...props}
        />
      </div>
    );
  }
);
InputOTP.displayName = "InputOTP";

const InputOTPGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center", className)} {...props} />
));
InputOTPGroup.displayName = "InputOTPGroup";

const InputOTPSlot = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <div className="relative">
    <input
      ref={ref}
      className={cn(
        "h-10 w-10 rounded-md border text-center text-base shadow-sm",
        "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
));
InputOTPSlot.displayName = "InputOTPSlot";

const InputOTPSeparator: React.FC = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn("flex items-center text-base text-muted-foreground", className)}
    role="separator"
    aria-hidden="true"
  >
    {children}
  </div>
);
InputOTPSeparator.displayName = "InputOTPSeparator";

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
