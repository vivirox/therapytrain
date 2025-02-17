import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'text',
    width,
    height,
    animate = true
}) => {
    const baseClasses = 'bg-gray-200 dark:bg-gray-700';
    const variantClasses = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-md'
    };

    const style: React.CSSProperties = {
        width: width || '100%',
        height: height || (variant === 'text' ? '1em' : '100%')
    };

    if (!animate) {
        return (
            <div
                className={`${baseClasses} ${variantClasses[variant]} ${className}`}
                style={style}
            />
        );
    }

    return (
        <motion.div
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={style}
            animate={{
                opacity: [0.5, 0.8, 0.5],
                transition: {
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }
            }}
        />
    );
};

export const MessageSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}
                >
                    <div className="flex flex-col space-y-2 max-w-[70%]">
                        <Skeleton
                            variant="text"
                            width={100}
                            height={16}
                            className="mb-1"
                        />
                        <Skeleton
                            variant="rectangular"
                            width={Math.random() * 200 + 100}
                            height={40}
                        />
                        <Skeleton
                            variant="text"
                            width={60}
                            height={12}
                            className="self-end"
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

export const ProfileSkeleton: React.FC = () => {
    return (
        <div className="flex items-center space-x-4 p-4">
            <Skeleton variant="circular" width={48} height={48} />
            <div className="flex-1 space-y-2">
                <Skeleton variant="text" width={150} height={20} />
                <Skeleton variant="text" width={100} height={16} />
            </div>
        </div>
    );
};

export const CardSkeleton: React.FC = () => {
    return (
        <div className="p-4 border rounded-lg space-y-4">
            <Skeleton variant="rectangular" height={200} />
            <Skeleton variant="text" width={200} height={24} />
            <div className="space-y-2">
                <Skeleton variant="text" />
                <Skeleton variant="text" />
                <Skeleton variant="text" width="60%" />
            </div>
        </div>
    );
}; 