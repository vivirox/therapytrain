import { XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
}

export function ErrorMessage({
  message,
  className,
  ...props
}: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        "flex items-center space-x-2 text-sm text-destructive",
        className
      )}
      {...props}
    >
      <XCircle className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}
