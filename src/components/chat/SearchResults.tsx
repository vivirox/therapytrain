import React, { useCallback } from 'react';
import { MessageSearchResult } from '../../types/chat';
import { Button } from '@/components/ui';
import { formatDate } from '@/utils/format';

interface SearchResultsProps {
  results: MessageSearchResult[];
  onLoadMore?: () => void;
  onJumpToMessage: (messageId: string) => void;
  hasMore?: boolean;
  isLoading?: boolean;
  className?: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  onLoadMore,
  onJumpToMessage,
  hasMore,
  isLoading,
  className
}) => {
  const renderHighlightedContent = useCallback((content: string) => {
    // Split content by highlight markers
    const parts = content.split(/(<\/?b>)/g);
    return parts.map((part, index) => {
      if (part === '<b>') return null;
      if (part === '</b>') return null;
      if (parts[index - 1] === '<b>' && parts[index + 1] === '</b>') {
        return (
          <mark
            key={index}
            className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded"
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  }, []);

  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No messages found matching your search.
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {results.map((result) => (
        <div
          key={result.id}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-2"
        >
          {/* Context: Previous Message */}
          {result.previous_message && (
            <div className="text-sm text-gray-500 dark:text-gray-400 pl-4 border-l-2 border-gray-200">
              {result.previous_message}
            </div>
          )}

          {/* Main Message */}
          <div className="relative">
            <div className="text-sm text-gray-900 dark:text-gray-100">
              {renderHighlightedContent(result.highlighted_content)}
            </div>

            {/* Metadata */}
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>{formatDate(result.created_at)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onJumpToMessage(result.id)}
                className="text-primary hover:text-primary-dark"
              >
                Jump to message
              </Button>
            </div>
          </div>

          {/* Context: Next Message */}
          {result.next_message && (
            <div className="text-sm text-gray-500 dark:text-gray-400 pl-4 border-l-2 border-gray-200">
              {result.next_message}
            </div>
          )}
        </div>
      ))}

      {/* Load More */}
      {hasMore && (
        <div className="text-center pt-4">
          <Button
            variant="secondary"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
}; 