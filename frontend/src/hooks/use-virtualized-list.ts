import { useCallback, useEffect, useRef, useState } from 'react';
interface UseVirtualizedListOptions {
    itemHeight: number;
    overscan?: number;
    containerHeight: number;
}
export function useVirtualizedList<T>(items: T[], { itemHeight, overscan = 3, containerHeight }: UseVirtualizedListOptions) {
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);
    const visibleItems = items.slice(startIndex, endIndex);
    const offsetY = startIndex * itemHeight;
    const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(event.currentTarget.scrollTop);
    }, []);
    useEffect(() => {
        const container = containerRef.current;
        if (!container)
            return;
        const resizeObserver = new ResizeObserver(() => {
            setScrollTop(container.scrollTop);
        });
        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);
    return {
        containerRef,
        visibleItems,
        startIndex,
        offsetY,
        totalHeight,
        handleScroll,
        style: {
            height: containerHeight,
            overflow: 'auto',
        },
        innerStyle: {
            height: totalHeight,
            position: 'relative' as const,
        },
    };
}
