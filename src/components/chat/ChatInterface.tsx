// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Message } from '@/types/chat';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat } from 'ai/react';

export function ChatInterface() {
    const {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        isLoading,
        error,
        append,
        reload,
        stop,
    } = useChat({
        api: '/api/chat',
        onError: (err) => {
            console.error('Chat error:', err);
        },
    });

    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <Card className="flex h-[600px] flex-col">
            <ScrollArea ref={scrollRef} className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={cn(
                                'flex w-max max-w-[80%] flex-col rounded-lg px-4 py-2',
                                message.role === 'user'
                                    ? 'ml-auto bg-primary text-primary-foreground'
                                    : 'bg-muted'
                            )}
                        >
                            <div className="text-sm font-medium">
                                {message.role === 'user' ? 'You' : 'Assistant'}
                            </div>
                            <div className="text-sm">{message.content}</div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">
                                Assistant is typing...
                            </span>
                        </div>
                    )}
                    {error && (
                        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                            {error.message}
                        </div>
                    )}
                </div>
            </ScrollArea>

            <form onSubmit={handleSubmit} className="flex gap-2 border-t p-4">
                <Input
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Type a message..."
                    disabled={isLoading}
                />
                <div className="flex gap-2">
                    {isLoading ? (
                        <Button type="button" variant="outline" onClick={stop}>
                            Stop
                        </Button>
                    ) : (
                        <Button type="button" variant="outline" onClick={reload}>
                            Retry
                        </Button>
                    )}
                    <Button type="submit" disabled={isLoading || !input.trim()}>
                        Send
                    </Button>
                </div>
            </form>
        </Card>
    );
}
