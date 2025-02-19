import { useState, useEffect } from 'react';

export const breakpoints = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536
} as const;

export type Breakpoint = keyof typeof breakpoints;

const getActiveBreakpoint = (): Breakpoint => {
    if (typeof window === 'undefined') return 'md';

    const width = window.innerWidth;
    if (width >= breakpoints['2xl']) return '2xl';
    if (width >= breakpoints.xl) return 'xl';
    if (width >= breakpoints.lg) return 'lg';
    if (width >= breakpoints.md) return 'md';
    return 'sm';
};

export function useBreakpoint() {
    const [breakpoint, setBreakpoint] = useState<Breakpoint>(getActiveBreakpoint());
    const [width, setWidth] = useState<number>(
        typeof window !== 'undefined' ? window.innerWidth : breakpoints.md
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            setWidth(window.innerWidth);
            setBreakpoint(getActiveBreakpoint());
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return {
        breakpoint,
        width,
        isMobile: breakpoint === 'sm',
        isTablet: breakpoint === 'md',
        isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
        isLargeDesktop: breakpoint === 'xl' || breakpoint === '2xl',
        isExtraLargeDesktop: breakpoint === '2xl',
        isGreaterThan: (bp: Breakpoint) => width >= breakpoints[bp],
        isLessThan: (bp: Breakpoint) => width < breakpoints[bp]
    };
} 