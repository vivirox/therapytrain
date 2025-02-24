import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

export function Spinner({ className, size = "md", ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div
      role="status"
      className={cn("flex items-center justify-center", className)}
      {...props}
    >
      <Loader2
        className={cn(
          "animate-spin text-muted-foreground",
          sizeClasses[size]
        )}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface LoadingDotsProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  color?: string;
}

export function LoadingDots({
  className,
  size = "md",
  color = "currentColor",
  ...props
}: LoadingDotsProps) {
  const sizeClasses = {
    sm: "h-1 w-1",
    md: "h-2 w-2",
    lg: "h-3 w-3",
  };

  const delayClasses = [
    "animate-bounce",
    "animate-bounce delay-100",
    "animate-bounce delay-200",
  ];

  return (
    <div
      role="status"
      className={cn("flex items-center space-x-1.5", className)}
      {...props}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "rounded-full",
            sizeClasses[size],
            delayClasses[i]
          )}
          style={{ backgroundColor: color }}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  progress: number;
  height?: number;
  showLabel?: boolean;
}

export function ProgressBar({
  className,
  progress,
  height = 2,
  showLabel = false,
  ...props
}: ProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      className={cn("w-full", className)}
      {...props}
    >
      {showLabel && (
        <div className="mb-1 flex justify-end">
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>
      )}
      <div
        className="overflow-hidden rounded-full bg-secondary"
        style={{ height }}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-in-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
