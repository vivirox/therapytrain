import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from './Spinner';

interface LoadingOverlayProps {
    isLoading: boolean;
    message?: string;
    className?: string;
    blur?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    isLoading,
    message = 'Loading...',
    className = '',
    blur = true
}) => {
    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`fixed inset-0 z-50 flex items-center justify-center ${
                        blur ? 'backdrop-blur-sm' : ''
                    } bg-black/30 ${className}`}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white rounded-lg shadow-xl p-6 flex flex-col items-center space-y-4"
                    >
                        <Spinner size="lg" />
                        {message && (
                            <p className="text-gray-600 text-sm font-medium">{message}</p>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}; 