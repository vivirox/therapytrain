import { type FC } from 'react';
import { MdPsychology } from 'react-icons/md';
import { cn } from '@/lib/utils';

interface LoadingProps {
    fullScreen?: boolean;
    message?: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
}

export const Loading: FC<LoadingProps> = ({
    fullScreen = false,
    message = 'Loading...',
    className,
    size = 'md',
    showIcon = true
}) => {
    const containerClasses = cn(
        'flex flex-col items-center justify-center space-y-4',
        fullScreen && 'fixed inset-0 bg-background/80 backdrop-blur-sm',
        className
    );

    const iconSizes = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    const textSizes = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg'
    };

    return (
        <div className={containerClasses}>
            {showIcon && (
                <MdPsychology 
                    className={cn(
                        'animate-spin text-primary',
                        iconSizes[size]
                    )} 
                />
            )}
            {message && (
                <p className={cn(
                    'text-muted-foreground',
                    textSizes[size]
                )}>
                    {message}
                </p>
            )}
        </div>
    );
};

export default Loading;
