import * as React from "react";
import { cn } from "@/lib/utils";
import { Alert } from "./alert";
import { Progress } from "./progress";
import { Button } from "./button";
import { Spinner } from "./Spinner";

export interface MessageRecoveryStatusProps extends React.HTMLAttributes<HTMLDivElement> {
  total: number;
  recovered: number;
  failed: number;
  isRecovering?: boolean;
  onRetry?: () => void;
}

export const MessageRecoveryStatus = React.forwardRef<HTMLDivElement, MessageRecoveryStatusProps>(
  ({ 
    className,
    total,
    recovered,
    failed,
    isRecovering = false,
    onRetry,
    ...props 
  }, ref) => {
    if (total === 0) return null;

    const progress = Math.round((recovered / total) * 100);
    const hasFailures = failed > 0;

    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        <Alert
          variant={hasFailures ? "destructive" : "default"}
          className="flex items-center justify-between"
        >
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              {isRecovering && <Spinner size="sm" />}
              <span>
                {isRecovering
                  ? "Recovering messages..."
                  : hasFailures
                  ? "Some messages failed to recover"
                  : "Message recovery complete"}
              </span>
            </div>
            <Progress value={progress} className="mt-2" />
            <div className="mt-1 text-sm">
              {recovered} of {total} messages recovered
              {failed > 0 && `, ${failed} failed`}
            </div>
          </div>
          {hasFailures && onRetry && !isRecovering && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="ml-4"
            >
              Retry Failed
            </Button>
          )}
        </Alert>
      </div>
    );
  }
);

MessageRecoveryStatus.displayName = "MessageRecoveryStatus"; 