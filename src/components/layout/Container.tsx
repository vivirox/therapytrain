import React from 'react';
import { useBreakpoint } from '../../hooks/useBreakpoint';

interface ContainerProps {
    children: React.ReactNode;
    className?: string;
    fluid?: boolean;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    padding?: boolean;
}

const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full'
};

export const Container: React.FC<ContainerProps> = ({
    children,
    className = '',
    fluid = false,
    maxWidth = '2xl',
    padding = true
}) => {
    const { breakpoint } = useBreakpoint();

    const containerClasses = [
        'w-full',
        'mx-auto',
        padding && 'px-4 sm:px-6 lg:px-8',
        !fluid && maxWidthClasses[maxWidth],
        className
    ]
        .filter(Boolean)
        .join(' ');

    return <div className={containerClasses}>{children}</div>;
};

export const ResponsiveGrid: React.FC<{
    children: React.ReactNode;
    className?: string;
    columns?: {
        sm?: number;
        md?: number;
        lg?: number;
        xl?: number;
        '2xl'?: number;
    };
    gap?: string;
}> = ({ children, className = '', columns = { sm: 1, md: 2, lg: 3, xl: 4 }, gap = '4' }) => {
    const gridClasses = [
        'grid',
        `gap-${gap}`,
        columns.sm && `grid-cols-${columns.sm}`,
        columns.md && `sm:grid-cols-${columns.md}`,
        columns.lg && `lg:grid-cols-${columns.lg}`,
        columns.xl && `xl:grid-cols-${columns.xl}`,
        columns['2xl'] && `2xl:grid-cols-${columns['2xl']}`,
        className
    ]
        .filter(Boolean)
        .join(' ');

    return <div className={gridClasses}>{children}</div>;
};

export const Stack: React.FC<{
    children: React.ReactNode;
    className?: string;
    direction?: 'row' | 'column';
    reverse?: boolean;
    spacing?: string;
    wrap?: boolean;
    responsive?: boolean;
}> = ({
    children,
    className = '',
    direction = 'column',
    reverse = false,
    spacing = '4',
    wrap = false,
    responsive = false
}) => {
    const stackClasses = [
        'flex',
        direction === 'column' && !reverse && 'flex-col',
        direction === 'column' && reverse && 'flex-col-reverse',
        direction === 'row' && !reverse && 'flex-row',
        direction === 'row' && reverse && 'flex-row-reverse',
        wrap && 'flex-wrap',
        responsive && direction === 'column' && 'sm:flex-row',
        responsive && direction === 'row' && 'sm:flex-col',
        `gap-${spacing}`,
        className
    ]
        .filter(Boolean)
        .join(' ');

    return <div className={stackClasses}>{children}</div>;
}; 