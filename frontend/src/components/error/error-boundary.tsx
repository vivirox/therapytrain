import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}
interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Error caught by error boundary:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (<div className="flex h-full w-full flex-col items-center justify-center p-4">
          <div className="flex flex-col items-center space-y-4 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive"/>
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <Button onClick={() => {
                    this.setState({ hasError: false, error: null });
                    window.location.reload();
                }}>
              Try again
            </Button>
          </div>
        </div>);
        }
        return this.props.children;
    }
}
interface ErrorBoundaryRouteProps {
    children: React.ReactNode;
}
export function ErrorBoundaryRoute({ children }: ErrorBoundaryRouteProps) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
}
