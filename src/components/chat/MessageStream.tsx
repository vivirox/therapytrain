import React, { useEffect, useRef, useState } from 'react';
import { Message } from '../../types/chat';
import { SessionState } from '../../types/session';
import { DistributedSessionManager } from '../../services/DistributedSessionManager';
import { useInView } from 'react-intersection-observer';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from '../ui/Spinner';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { LoadingOverlay } from '../ui/LoadingOverlay';
import { MessageSkeleton } from '../ui/Skeleton';
import { useToast } from '../ui/Toast';
import { useRetry } from '../../hooks/useRetry';
import { Container, Stack } from '../layout/Container';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { ErrorFallback } from '../ui/ErrorFallback';

interface MessageStreamProps {
    sessionId: string;
    className?: string;
}

interface MessageGroup {
    sender: string;
    messages: Message[];
    timestamp: Date;
}

export const MessageStream: React.FC<MessageStreamProps> = ({ sessionId, className }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageGroups, setMessageGroups] = useState<MessageGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [session, setSession] = useState<SessionState | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { ref: loadMoreRef, inView } = useInView();
    const sessionManager = DistributedSessionManager.getInstance();
    const { showToast } = useToast();
    const { isMobile } = useBreakpoint();
    const { handleError, clearError } = useErrorHandler();

    const loadMessages = async () => {
        try {
            const sessionData = await sessionManager.getSession(sessionId);
            if (!sessionData) {
                throw new Error('Session not found');
            }
            setSession(sessionData);
            // TODO: Load messages from your message service
            // const initialMessages = await messageService.getMessages(sessionId);
            // setMessages(initialMessages);
        } catch (err) {
            handleError(err);
            throw err;
        }
    };

    const { execute: executeLoadMessages, isRetrying } = useRetry(loadMessages, {
        maxAttempts: 3,
        initialDelay: 1000
    });

    // Load initial messages and set up real-time updates
    useEffect(() => {
        let mounted = true;
        const initializeMessages = async () => {
            try {
                setIsLoading(true);
                await executeLoadMessages();
            } catch (err) {
                if (mounted) {
                    const error = err instanceof Error ? err : new Error('Failed to load messages');
                    setError(error);
                    handleError(error);
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        initializeMessages();
        return () => {
            mounted = false;
            clearError();
        };
    }, [sessionId, executeLoadMessages, handleError, clearError]);

    // Group messages by sender and time proximity
    useEffect(() => {
        const groups: MessageGroup[] = [];
        let currentGroup: MessageGroup | null = null;

        messages.forEach((message) => {
            const messageTime = new Date(message.timestamp);

            if (!currentGroup || 
                currentGroup.sender !== message.sender ||
                messageTime.getTime() - new Date(currentGroup.timestamp).getTime() > 300000) {
                currentGroup = {
                    sender: message.sender,
                    messages: [message],
                    timestamp: messageTime
                };
                groups.push(currentGroup);
            } else {
                currentGroup.messages.push(message);
            }
        });

        setMessageGroups(groups);
    }, [messages]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messageGroups]);

    // Load more messages when scrolling up
    const loadMoreMessages = async () => {
        try {
            // TODO: Implement loading more messages
            // const olderMessages = await messageService.getMessages(sessionId, {
            //     before: messages[0]?.timestamp,
            //     limit: 20
            // });
            // setMessages(prev => [...olderMessages, ...prev]);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated delay
        } catch (err) {
            handleError(err);
            throw err;
        }
    };

    const { execute: executeLoadMore, isRetrying: isRetryingLoadMore } = useRetry(loadMoreMessages, {
        maxAttempts: 3,
        initialDelay: 1000
    });

    useEffect(() => {
        if (inView && !isLoadingMore && !isRetryingLoadMore) {
            const loadMore = async () => {
                setIsLoadingMore(true);
                try {
                    await executeLoadMore();
                } catch (err) {
                    handleError(err);
                } finally {
                    setIsLoadingMore(false);
                }
            };
            loadMore();
        }
    }, [inView, isLoadingMore, executeLoadMore, handleError, isRetryingLoadMore]);

    if (error) {
        return (
            <Container maxWidth="lg" className="h-full">
                <ErrorFallback
                    error={error}
                    resetErrorBoundary={() => {
                        clearError();
                        executeLoadMessages();
                    }}
                    message="Failed to load messages"
                />
            </Container>
        );
    }

    return (
        <ErrorBoundary
            onError={(error, errorInfo) => handleError(error, errorInfo.componentStack)}
            onReset={clearError}
            message="Something went wrong with the message display"
        >
            <Container 
                maxWidth="lg" 
                className={`h-full ${isMobile ? 'px-2' : 'px-4'} ${className}`}
            >
                <div className="flex flex-col h-full overflow-hidden">
                    {isLoading ? (
                        <div className="flex-1">
                            <MessageSkeleton count={5} />
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto">
                            {/* Load more trigger */}
                            <div ref={loadMoreRef} className="h-8 flex justify-center">
                                {(isLoadingMore || isRetryingLoadMore) && <Spinner size="sm" />}
                            </div>

                            {/* Message groups */}
                            <Stack spacing={isMobile ? "2" : "4"} className="pb-4">
                                <AnimatePresence initial={false}>
                                    {messageGroups.map((group, index) => (
                                        <motion.div
                                            key={`${group.sender}-${group.timestamp}`}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            className={`flex flex-col ${
                                                group.sender === session?.clientId ? 'items-end' : 'items-start'
                                            }`}
                                        >
                                            {/* Sender info */}
                                            <div className={`${isMobile ? 'px-2' : 'px-4'} mb-1 text-sm text-gray-500`}>
                                                {group.sender === session?.clientId ? 'You' : 'Therapist'}
                                            </div>

                                            {/* Messages */}
                                            <Stack spacing={isMobile ? "1" : "2"}>
                                                {group.messages.map((message, msgIndex) => (
                                                    <motion.div
                                                        key={message.id}
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        className={`${isMobile ? 'px-3 py-2' : 'px-4 py-2'} rounded-lg ${
                                                            isMobile ? 'max-w-[90%]' : 'max-w-[80%]'
                                                        } ${
                                                            message.sender === session?.clientId
                                                                ? 'bg-blue-500 text-white ml-4'
                                                                : 'bg-gray-100 text-gray-900 mr-4'
                                                        }`}
                                                    >
                                                        <p className="whitespace-pre-wrap break-words">
                                                            {message.content}
                                                        </p>
                                                        {message.status === 'error' && (
                                                            <div className="text-red-500 text-sm mt-1">
                                                                Failed to send. Tap to retry.
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                ))}
                                            </Stack>

                                            {/* Timestamp */}
                                            <div className={`${isMobile ? 'px-2' : 'px-4'} text-xs text-gray-400`}>
                                                {new Date(group.timestamp).toLocaleTimeString()}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </Stack>

                            {/* Scroll anchor */}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>
            </Container>
        </ErrorBoundary>
    );
}; 