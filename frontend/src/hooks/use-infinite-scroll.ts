import { useEffect, useRef, useState, useCallback } from 'react';
import { useInView } from '@/components/ui/transitions';

interface UseInfiniteScrollOptions<T> {
  fetchMore: (page: number) => Promise<T[]>;
  initialItems?: T[];
  threshold?: number;
  pageSize?: number;
}

export function useInfiniteScroll<T>({
  fetchMore,
  initialItems = [],
  threshold = 0.5,
  pageSize = 20,
}: UseInfiniteScrollOptions<T>) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef(false);

  const { ref, isInView } = useInView({
    threshold,
    rootMargin: '100px',
  });

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;

    loadingRef.current = true;
    setIsLoading(true);

    try {
      const newItems = await fetchMore(page);
      
      if (newItems.length < pageSize) {
        setHasMore(false);
      }

      setItems(prev => [...prev, ...newItems]);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Error loading more items:', error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [fetchMore, page, pageSize, hasMore]);

  useEffect(() => {
    if (isInView) {
      loadMore();
    }
  }, [isInView, loadMore]);

  const reset = useCallback(() => {
    setItems(initialItems);
    setPage(1);
    setHasMore(true);
    loadingRef.current = false;
  }, [initialItems]);

  return {
    items,
    isLoading,
    hasMore,
    loadingRef: ref,
    reset,
  };
}
