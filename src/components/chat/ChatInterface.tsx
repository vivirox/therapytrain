// @ts-nocheck
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { Message, ChatSession, MessageStatus } from '@/types/chat';
import { useToast } from '@/hooks/useToast';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { ZKService } from '@/lib/zk/ZKService';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ChatBubble } from './ChatBubble';
import { TypingIndicator } from './TypingIndicator';
import { ChatInput } from './ChatInput';
import { Button } from '../ui/Button';
import { ChatService } from '../../services/chat/ChatService';
import { MessageRecoveryStatus } from './MessageRecoveryStatus';
import { AttachmentManager } from '../Attachments/AttachmentManager';
import { SearchBar } from './SearchBar';
import { SearchResults } from './SearchResults';
import { MessageSearchService } from '../../services/chat/MessageSearchService';
import { MessageSearchResult, SearchOptions } from '../../types/chat';

interface ChatInterfaceProps {
  threadId: string;
  recipientId: string;
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  threadId, 
  recipientId, 
  className 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [failedMessages, setFailedMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [isRecovering, setIsRecovering] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [searchResults, setSearchResults] = useState<MessageSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [searchOffset, setSearchOffset] = useState(0);
  const [currentSearch, setCurrentSearch] = useState<SearchOptions | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const toast = useToast();
  const supabase = useSupabaseClient();
  const zkService = ZKService.getInstance();
  const chatService = ChatService.getInstance();
  const searchService = MessageSearchService.getInstance(supabase, redis);
  
  const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/chat`;
  const { sendMessage, lastMessage, connectionStatus } = useWebSocket(wsUrl, {
    threadId,
    recipientId,
    onError: (error) => {
      setError(error);
      toast.showToast({
        title: 'Connection Error',
        description: 'Failed to connect to chat server. Messages will be queued.',
        type: 'error'
      });
    }
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'message') {
        setMessages(prev => [...prev, lastMessage.payload]);
        scrollToBottom();
      } else if (lastMessage.type === 'messages_recovered') {
        toast.showToast({
          title: 'Messages Recovered',
          description: `${lastMessage.payload.count} messages have been recovered.`,
          type: 'success'
        });
        // Refresh messages to include recovered ones
        loadMessages();
      }
    }
  }, [lastMessage, scrollToBottom]);

  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      // Load messages from your message service
      const response = await fetch(`/api/chat/messages?threadId=${threadId}`);
      if (!response.ok) throw new Error('Failed to load messages');
      const data = await response.json();
      setMessages(data.messages);
      
      // Load failed messages
      const failedResponse = await fetch(`/api/chat/failed-messages?threadId=${threadId}`);
      if (failedResponse.ok) {
        const failedData = await failedResponse.json();
        setFailedMessages(failedData.messages);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load messages'));
      toast.showToast({
        title: 'Error',
        description: 'Failed to load messages',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [threadId, toast]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Handle incoming messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const message = JSON.parse(lastMessage.data) as Message;
        setMessages(prev => [...prev, message]);
        scrollToBottom();

        // Update participants if it's a status message
        if (message.type === 'status') {
          if (message.content === 'online') {
            setParticipants(prev => [...new Set([...prev, message.user_id])]);
          } else if (message.content === 'offline') {
            setParticipants(prev => prev.filter(id => id !== message.user_id));
          }
        }
      } catch (error) {
        console.error('Error parsing message:', error);
        toast.showToast({
          title: 'Error',
          description: 'Error receiving message',
          type: 'error'
        });
      }
    }
  }, [lastMessage, toast]);

  // Subscribe to thread changes
  useEffect(() => {
    const channel = supabase
      .channel(`thread:${threadId}`)
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const onlineUsers = Object.keys(presenceState);
        setParticipants(onlineUsers);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const newUsers = newPresences.map(p => p.user_id);
        setParticipants(prev => [...new Set([...prev, ...newUsers])]);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const leftUsers = leftPresences.map(p => p.user_id);
        setParticipants(prev => prev.filter(id => !leftUsers.includes(id)));
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [threadId, supabase]);

  const handleSendMessage = async (content: string) => {
    if (!user || !content.trim()) return;

    const message: Message = {
      id: crypto.randomUUID(),
      threadId,
      senderId: user.id,
      recipientId,
      content,
      timestamp: new Date(),
      status: MessageStatus.PENDING
    };

    // Optimistically add message to list
    setMessages(prev => [...prev, message]);
    scrollToBottom();

    try {
      await sendMessage(message);
    } catch (err) {
      // Message will be handled by recovery service
      toast.showToast({
        title: 'Message Queued',
        description: 'Message will be sent when connection is restored',
        type: 'info'
      });
    }
  };

  const handleTypingStatus = async (isTyping: boolean) => {
    if (!user) return;

    try {
      setIsTyping(isTyping);
      await sendMessage(JSON.stringify({
        type: isTyping ? 'typing_started' : 'typing_stopped',
        user_id: user.id,
        thread_id: threadId,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  const handleRecoverMessages = async () => {
    try {
      setIsRecovering(true);
      const recoveredCount = await chatService.recoverThreadMessages(threadId);
      
      if (recoveredCount > 0) {
        toast.showToast({
          title: 'Recovery Started',
          description: `Attempting to recover ${recoveredCount} messages`,
          type: 'info'
        });
      } else {
        toast.showToast({
          title: 'No Messages to Recover',
          description: 'All messages are up to date',
          type: 'info'
        });
      }
    } catch (err) {
      toast.showToast({
        title: 'Recovery Failed',
        description: 'Failed to recover messages',
        type: 'error'
      });
    } finally {
      setIsRecovering(false);
    }
  };

  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: user?.id,
        emoji
      });

      // Optimistically update the UI
      setMessages(prev => prev.map(msg => {
        if (msg.id !== messageId) return msg;

        const existingReaction = msg.reactions?.find(r => r.emoji === emoji);
        const updatedReactions = msg.reactions || [];

        if (existingReaction) {
          existingReaction.count++;
          existingReaction.user_ids.push(user!.id);
        } else {
          updatedReactions.push({
            message_id: messageId,
            emoji,
            count: 1,
            user_ids: [user!.id]
          });
        }

        return {
          ...msg,
          reactions: updatedReactions
        };
      }));

      // Notify other users
      sendMessage({
        type: 'reaction_added',
        message_id: messageId,
        user_id: user!.id,
        emoji,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      toast.showToast({
        title: 'Error',
        description: 'Failed to add reaction',
        type: 'error'
      });
    }
  }, [user, supabase, sendMessage, toast]);

  const handleRemoveReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      await supabase
        .from('message_reactions')
        .delete()
        .match({
          message_id: messageId,
          user_id: user?.id,
          emoji
        });

      // Optimistically update the UI
      setMessages(prev => prev.map(msg => {
        if (msg.id !== messageId) return msg;

        const updatedReactions = msg.reactions?.map(r => {
          if (r.emoji !== emoji) return r;
          return {
            ...r,
            count: r.count - 1,
            user_ids: r.user_ids.filter(id => id !== user!.id)
          };
        }).filter(r => r.count > 0) || [];

        return {
          ...msg,
          reactions: updatedReactions
        };
      }));

      // Notify other users
      sendMessage({
        type: 'reaction_removed',
        message_id: messageId,
        user_id: user!.id,
        emoji,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      toast.showToast({
        title: 'Error',
        description: 'Failed to remove reaction',
        type: 'error'
      });
    }
  }, [user, supabase, sendMessage, toast]);

  // Update message handling to include reactions
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'message') {
        setMessages(prev => [...prev, lastMessage.payload]);
        scrollToBottom();
      } else if (lastMessage.type === 'messages_recovered') {
        toast.showToast({
          title: 'Messages Recovered',
          description: `${lastMessage.payload.count} messages have been recovered.`,
          type: 'success'
        });
        loadMessages();
      } else if (lastMessage.type === 'reaction_added' || lastMessage.type === 'reaction_removed') {
        const { message_id, user_id, emoji } = lastMessage.payload;
        if (user_id !== user?.id) { // Only update if reaction is from another user
          setMessages(prev => prev.map(msg => {
            if (msg.id !== message_id) return msg;

            const existingReaction = msg.reactions?.find(r => r.emoji === emoji);
            const updatedReactions = msg.reactions || [];

            if (lastMessage.type === 'reaction_added') {
              if (existingReaction) {
                existingReaction.count++;
                existingReaction.user_ids.push(user_id);
              } else {
                updatedReactions.push({
                  message_id,
                  emoji,
                  count: 1,
                  user_ids: [user_id]
                });
              }
            } else {
              if (existingReaction) {
                existingReaction.count--;
                existingReaction.user_ids = existingReaction.user_ids.filter(id => id !== user_id);
                if (existingReaction.count === 0) {
                  return {
                    ...msg,
                    reactions: updatedReactions.filter(r => r.emoji !== emoji)
                  };
                }
              }
            }

            return {
              ...msg,
              reactions: updatedReactions
            };
          }));
        }
      }
    }
  }, [lastMessage, scrollToBottom, loadMessages, user?.id]);

  const handleSearch = useCallback(async (options: SearchOptions) => {
    setIsSearching(true);
    setSearchOffset(0);
    setCurrentSearch(options);

    try {
      const results = await searchService.searchMessages({
        ...options,
        limit: 20,
        offset: 0
      });

      setSearchResults(results);
      setHasMoreResults(results.length === 20);
      scrollToBottom();
    } catch (err) {
      toast.showToast({
        title: 'Search Failed',
        description: err instanceof Error ? err.message : 'Failed to search messages',
        type: 'error'
      });
    } finally {
      setIsSearching(false);
    }
  }, [searchService, toast, scrollToBottom]);

  const handleLoadMore = useCallback(async () => {
    if (!currentSearch || isSearching) return;

    setIsSearching(true);
    const nextOffset = searchOffset + 20;

    try {
      const results = await searchService.searchMessages({
        ...currentSearch,
        limit: 20,
        offset: nextOffset
      });

      setSearchResults(prev => [...prev, ...results]);
      setHasMoreResults(results.length === 20);
      setSearchOffset(nextOffset);
    } catch (err) {
      toast.showToast({
        title: 'Failed to Load More',
        description: err instanceof Error ? err.message : 'Failed to load more results',
        type: 'error'
      });
    } finally {
      setIsSearching(false);
    }
  }, [currentSearch, isSearching, searchOffset, searchService, toast]);

  const handleClearSearch = useCallback(() => {
    setSearchResults([]);
    setCurrentSearch(null);
    setSearchOffset(0);
    setHasMoreResults(false);
  }, []);

  const handleJumpToMessage = useCallback((messageId: string) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth' });
      messageElement.classList.add('highlight-message');
      setTimeout(() => {
        messageElement.classList.remove('highlight-message');
      }, 2000);
    }
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <p className="text-red-500 mb-4">Failed to load messages</p>
        <Button onClick={loadMessages}>Retry</Button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={`flex flex-col h-full ${className}`}>
        <MessageRecoveryStatus 
          threadId={threadId}
          onRecoveryComplete={() => {
            loadMessages();
          }}
        />

        {/* Connection status */}
        {connectionStatus !== 'connected' && (
          <div className="bg-yellow-100 p-2 text-sm text-yellow-800">
            {connectionStatus === 'connecting' ? 'Connecting...' : 'Connection lost. Messages will be queued.'}
          </div>
        )}

        {/* Failed messages recovery */}
        {failedMessages.length > 0 && (
          <div className="bg-red-100 p-2 text-sm text-red-800 flex items-center justify-between">
            <span>{failedMessages.length} failed messages</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRecoverMessages}
              disabled={isRecovering}
            >
              {isRecovering ? 'Recovering...' : 'Recover Messages'}
            </Button>
          </div>
        )}

        {/* Attachments Panel */}
        <div className="border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAttachments(!showAttachments)}
            className="w-full flex items-center justify-between px-4 py-2"
          >
            <span className="flex items-center">
              <svg
                className={`w-4 h-4 mr-2 transition-transform ${showAttachments ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              Attachments
            </span>
            <span className="text-xs text-gray-500">
              {showAttachments ? 'Hide' : 'Show'}
            </span>
          </Button>
          {showAttachments && (
            <div className="p-4 border-t bg-gray-50">
              <AttachmentManager
                threadId={threadId}
                messageId={undefined}
              />
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="border-b p-4">
          <SearchBar
            threadId={threadId}
            onSearch={handleSearch}
            onClear={handleClearSearch}
            isLoading={isSearching}
          />
        </div>

        {/* Messages or Search Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {searchResults.length > 0 ? (
            <SearchResults
              results={searchResults}
              onLoadMore={handleLoadMore}
              onJumpToMessage={handleJumpToMessage}
              hasMore={hasMoreResults}
              isLoading={isSearching}
            />
          ) : (
            <>
              {isLoading ? (
                <div className="flex justify-center">
                  <Spinner />
                </div>
              ) : (
                messages.map((message) => (
                  <ChatBubble
                    key={message.id}
                    message={message}
                    isOwn={message.senderId === user?.id}
                    onReact={handleReaction}
                    onRemoveReaction={handleRemoveReaction}
                    id={`message-${message.id}`}
                  />
                ))
              )}
              {isTyping && <TypingIndicator />}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <ChatInput
            onSendMessage={handleSendMessage}
            onTyping={handleTypingStatus}
            disabled={connectionStatus === 'disconnected'}
            isLoading={isSending}
            placeholder={
              connectionStatus === 'disconnected'
                ? 'Connection lost. Messages will be queued...'
                : 'Type a message...'
            }
          />
        </div>
      </div>

      <style jsx>{`
        .highlight-message {
          animation: highlight 2s ease-in-out;
        }

        @keyframes highlight {
          0%, 100% {
            background-color: transparent;
          }
          50% {
            background-color: rgba(59, 130, 246, 0.1);
          }
        }
      `}</style>
    </ErrorBoundary>
  );
};
