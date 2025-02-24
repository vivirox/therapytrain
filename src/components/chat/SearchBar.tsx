import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { SearchOptions } from '../../types/chat';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { useSupabase } from '../../hooks/useSupabase';
import { useRedis } from '../../hooks/useRedis';
import { MessageSearchService } from '../../services/chat/MessageSearchService';

interface SearchBarProps {
  threadId: string;
  onSearch: (options: SearchOptions) => void;
  onClear: () => void;
  isLoading?: boolean;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  threadId,
  onSearch,
  onClear,
  isLoading,
  className
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filters, setFilters] = useState<Partial<SearchOptions>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  const { supabase } = useSupabase();
  const { redis } = useRedis();
  const searchService = MessageSearchService.getInstance(supabase, redis);

  // Load recent searches for suggestions
  useEffect(() => {
    const loadSuggestions = async () => {
      if (!debouncedQuery) {
        const history = await searchService.getSearchHistory(threadId);
        setSuggestions(
          Array.from(new Set(history.map(h => h.query))).slice(0, 5)
        );
        return;
      }

      // Get search history matching the query
      const history = await searchService.getSearchHistory(threadId);
      const matchingSuggestions = history
        .map(h => h.query)
        .filter(q => q.toLowerCase().includes(debouncedQuery.toLowerCase()))
        .slice(0, 5);

      setSuggestions(matchingSuggestions);
    };

    loadSuggestions();
  }, [debouncedQuery, threadId, searchService]);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    setShowSuggestions(false);
    onSearch({
      query: query.trim(),
      thread_id: threadId,
      ...filters
    });
  }, [query, threadId, filters, onSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex > -1) {
          setQuery(suggestions[selectedIndex]);
          setShowSuggestions(false);
          onSearch({
            query: suggestions[selectedIndex],
            thread_id: threadId,
            ...filters
          });
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  }, [suggestions, selectedIndex, threadId, filters, onSearch, handleSearch]);

  // Handle clicks outside suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search messages..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isLoading}
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Spinner size="sm" />
            </div>
          )}
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setQuery('');
            setFilters({});
            onClear();
          }}
          disabled={isLoading || !query}
        >
          Clear
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSearch}
          disabled={isLoading || !query.trim()}
        >
          Search
        </Button>
      </div>

      {/* Search Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              className={`
                w-full px-4 py-2 text-left hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg
                ${index === selectedIndex ? 'bg-gray-100' : ''}
              `}
              onClick={() => {
                setQuery(suggestion);
                setShowSuggestions(false);
                onSearch({
                  query: suggestion,
                  thread_id: threadId,
                  ...filters
                });
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Search Filters */}
      <div className="flex flex-wrap gap-2 mt-2">
        <Button
          variant={filters.sort === 'rank' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilters(prev => ({ ...prev, sort: 'rank' }))}
        >
          Best Match
        </Button>
        <Button
          variant={filters.sort === 'date_desc' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilters(prev => ({ ...prev, sort: 'date_desc' }))}
        >
          Newest
        </Button>
        <Button
          variant={filters.sort === 'date_asc' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilters(prev => ({ ...prev, sort: 'date_asc' }))}
        >
          Oldest
        </Button>
      </div>
    </div>
  );
}; 