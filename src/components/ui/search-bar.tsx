import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Button } from "./button";
import { Spinner } from "./spinner";

export interface SearchBarProps extends React.HTMLAttributes<HTMLDivElement> {
  onSearch: (query: string) => void;
  onClear?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  defaultValue?: string;
}

export const SearchBar = React.forwardRef<HTMLDivElement, SearchBarProps>(
  ({ 
    className, 
    onSearch, 
    onClear, 
    isLoading, 
    placeholder = "Search...", 
    defaultValue = "",
    ...props 
  }, ref) => {
    const [query, setQuery] = React.useState(defaultValue);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        onSearch(query.trim());
      }
    };

    const handleClear = () => {
      setQuery("");
      if (onClear) {
        onClear();
      }
    };

    return (
      <form
        ref={ref}
        onSubmit={handleSubmit}
        className={cn("relative", className)}
        {...props}
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="pr-8"
              disabled={isLoading}
            />
            {isLoading && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Spinner size="sm" />
              </div>
            )}
          </div>
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={isLoading}
            >
              Clear
            </Button>
          )}
          <Button type="submit" disabled={!query.trim() || isLoading}>
            Search
          </Button>
        </div>
      </form>
    );
  }
);

SearchBar.displayName = "SearchBar"; 