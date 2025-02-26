import * as React from "react";
import { cn } from "@/lib/utils";

export interface TypingIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
}

export const TypingIndicator = React.forwardRef<HTMLDivElement, TypingIndicatorProps>(
  ({ className, text = "Someone is typing", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center space-x-2 text-sm text-muted-foreground", className)}
        {...props}
      >
        <div className="flex space-x-1">
          <span className="animate-bounce delay-0 h-1.5 w-1.5 bg-current rounded-full" />
          <span className="animate-bounce delay-150 h-1.5 w-1.5 bg-current rounded-full" />
          <span className="animate-bounce delay-300 h-1.5 w-1.5 bg-current rounded-full" />
        </div>
        <span>{text}</span>
      </div>
    );
  }
);

TypingIndicator.displayName = "TypingIndicator"; 