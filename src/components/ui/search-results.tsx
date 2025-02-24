import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Spinner } from "./spinner";

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  highlight?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchResultsProps extends React.HTMLAttributes<HTMLDivElement> {
  results: SearchResult[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  onResultClick?: (result: SearchResult) => void;
}

export const SearchResults = React.forwardRef<HTMLDivElement, SearchResultsProps>(
  ({ 
    className, 
    results, 
    onLoadMore, 
    hasMore, 
    isLoading,
    onResultClick,
    ...props 
  }, ref) => {
    if (results.length === 0 && !isLoading) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No results found
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("space-y-4", className)} {...props}>
        {results.map((result) => (
          <div
            key={result.id}
            className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => onResultClick?.(result)}
          >
            <h3 className="font-medium mb-1">{result.title}</h3>
            {result.highlight ? (
              <div
                className="text-sm text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: result.highlight }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{result.content}</p>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        )}

        {hasMore && !isLoading && onLoadMore && (
          <div className="flex justify-center pt-4">
            <Button onClick={onLoadMore} variant="outline">
              Load More
            </Button>
          </div>
        )}
      </div>
    );
  }
);

SearchResults.displayName = "SearchResults"; 