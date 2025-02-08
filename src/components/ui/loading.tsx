import * as React from "react"
import { cn } from '@/lib/utils'

interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
    className?: string;
}

const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8",
    }

    return (
      <div
        ref={ref}
        className={cn("animate-spin", sizeClasses[size], className)}
        {...props}
      >
        <div className="h-full w-full rounded-full border-2 border-current border-t-transparent" />
      </div>
    )
  }
)
Loading.displayName = "Loading"

export { Loading }
