import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

export interface MessageSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  count?: number;
}

export const MessageSkeleton = React.forwardRef<HTMLDivElement, MessageSkeletonProps>(
  ({ className, count = 3, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-4", className)} {...props}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start space-x-4",
              i % 2 === 0 ? "flex-row" : "flex-row-reverse space-x-reverse"
            )}
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[180px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }
);

MessageSkeleton.displayName = "MessageSkeleton"; 