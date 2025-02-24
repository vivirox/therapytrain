import * as React from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  fullScreen?: boolean;
  message?: string;
}

export const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ className, fullScreen = false, message = "Loading...", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center bg-background/80",
          fullScreen ? "fixed inset-0 z-50" : "absolute inset-0",
          className
        )}
        {...props}
      >
        <Spinner size="lg" className="text-primary" />
        {message && (
          <p className="mt-4 text-sm text-muted-foreground">{message}</p>
        )}
      </div>
    );
  }
);

LoadingOverlay.displayName = "LoadingOverlay"; 