import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useSupabase } from '@/hooks/useSupabase';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ZKService } from '@/lib/zk/ZKService';
import { ChatService } from '@/lib/chat/ChatService';
import { MessageSearchService } from '@/lib/search/MessageSearchService';
import { ThreadManagementService } from '@/lib/chat/ThreadManagementService';
import { ThreadList, ThreadCreateDialog } from '../ThreadList';
import {
  Message,
  MessageSearchResult,
  SearchOptions,
  Thread,
  MessageStatus
} from '@/types/chat';
import { UserProfile } from '@/types/user';
import {
  Button,
  ChatBubble,
  SearchBar,
  SearchResults,
  AttachmentManager,
  TypingIndicator,
  MessageRecoveryStatus,
  Spinner
} from '@/components/ui';

interface ChatInterfaceProps {
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ className }) => {
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
  
  // Thread state
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [availableParticipants, setAvailableParticipants] = useState<UserProfile[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const toast = useToast();
  const supabase = useSupabase();
  const zkService = ZKService.getInstance();
  const chatService = ChatService.getInstance();
  const searchService = MessageSearchService.getInstance(supabase);
  const threadService = ThreadManagementService.getInstance(supabase);
  
  const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/chat`;
  const { sendMessage: sendWebSocketMessage, lastMessage, connectionStatus } = useWebSocket(wsUrl, {
    threadId: selectedThreadId || undefined,
    onError: (error: Error) => {
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

  // Load available participants
  useEffect(() => {
    const loadParticipants = async () => {
      try {
        const { data: users, error } = await supabase
          .from('users')
          .select('*')
          .neq('id', user?.id);

        if (error) throw error;
        setAvailableParticipants(users);
      } catch (err) {
        toast.showToast({
          title: 'Error',
          description: 'Failed to load available participants',
          type: 'error'
        });
      }
    };

    loadParticipants();
  }, [supabase, user?.id, toast]);

  // Load thread data when selected thread changes
  useEffect(() => {
    const loadThread = async () => {
      if (!selectedThreadId) {
        setSelectedThread(null);
        return;
      }

      try {
        const thread = await threadService.getThread(selectedThreadId);
        setSelectedThread(thread);
      } catch (err) {
        toast.showToast({
          title: 'Error',
          description: 'Failed to load thread details',
          type: 'error'
        });
      }
    };

    loadThread();
  }, [selectedThreadId, threadService, toast]);

  const loadMessages = useCallback(async () => {
    if (!selectedThreadId) {
      setMessages([]);
      setFailedMessages([]);
      return;
    }

    try {
      setIsLoading(true);
      // Load messages from your message service
      const response = await fetch(`/api/chat/messages?threadId=${selectedThreadId}`);
      if (!response.ok) throw new Error('Failed to load messages');
      const data = await response.json();
      setMessages(data.messages);
      
      // Load failed messages
      const failedResponse = await fetch(`/api/chat/failed-messages?threadId=${selectedThreadId}`);
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
  }, [selectedThreadId, toast]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Handle incoming messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const message = JSON.parse(lastMessage.data) as Message;
        if (message.thread_id === selectedThreadId) {
          setMessages(prev => [...prev, message]);
          scrollToBottom();
        }

        // Update participants if it's a status message
        if (message.metadata?.type === 'status') {
          if (message.content === 'online') {
            setParticipants(prev => [...new Set([...prev, message.sender])]);
          } else if (message.content === 'offline') {
            setParticipants(prev => prev.filter(id => id !== message.sender));
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
  }, [lastMessage, selectedThreadId, toast]);

  // Subscribe to thread changes
  useEffect(() => {
    if (!selectedThreadId) return;

    const channel = supabase
      .channel(`thread:${selectedThreadId}`)
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const onlineUsers = Object.keys(presenceState);
        setParticipants(onlineUsers);
      })
      .on('presence', { event: 'join' }, ({ newPresences }: { newPresences: Array<{ user_id: string }> }) => {
        const newUsers = newPresences.map(p => p.user_id);
        setParticipants(prev => [...new Set([...prev, ...newUsers])]);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }: { leftPresences: Array<{ user_id: string }> }) => {
        const leftUsers = leftPresences.map(p => p.user_id);
        setParticipants(prev => prev.filter(id => !leftUsers.includes(id)));
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedThreadId, supabase]);

  const handleSendMessage = async (content: string) => {
    if (!user || !content.trim() || !selectedThreadId) return;

    const message: Message = {
      id: crypto.randomUUID(),
      thread_id: selectedThreadId,
      sender: user.id,
      content,
      timestamp: new Date().toISOString(),
      status: MessageStatus.PENDING
    };

    // Optimistically add message to list
    setMessages(prev => [...prev, message]);
    scrollToBottom();

    try {
      await sendWebSocketMessage(JSON.stringify(message));
    } catch (err) {
      // Message will be handled by recovery service
      toast.showToast({
        title: 'Message Queued',
        description: 'Message will be sent when connection is restored',
        type: 'info'
      });
    }
  };

  const handleThreadSelect = (threadId: string) => {
    setSelectedThreadId(threadId);
    // Clear search results when switching threads
    setSearchResults([]);
    setCurrentSearch(null);
    setSearchOffset(0);
    setHasMoreResults(false);
  };

  const handleSearch = async (options: SearchOptions) => {
    if (!selectedThreadId) return;

    try {
      setIsSearching(true);
      const results = await searchService.searchMessages({
        ...options,
        threadId: selectedThreadId
      });
      setSearchResults(results.messages);
      setHasMoreResults(results.hasMore);
      setCurrentSearch(options);
    } catch (err) {
      toast.showToast({
        title: 'Search Error',
        description: 'Failed to search messages',
        type: 'error'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadMore = async () => {
    if (!currentSearch || !selectedThreadId || !hasMoreResults) return;

    try {
      setIsSearching(true);
      const newOffset = searchOffset + (currentSearch.limit || 20);
      const results = await searchService.searchMessages({
        ...currentSearch,
        threadId: selectedThreadId,
        offset: newOffset
      });
      setSearchResults(prev => [...prev, ...results.messages]);
      setHasMoreResults(results.hasMore);
      setSearchOffset(newOffset);
    } catch (err) {
      toast.showToast({
        title: 'Error',
        description: 'Failed to load more results',
        type: 'error'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchResults([]);
    setCurrentSearch(null);
    setSearchOffset(0);
    setHasMoreResults(false);
  };

  const handleJumpToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight');
      setTimeout(() => element.classList.remove('highlight'), 2000);
    }
  };

  const handleRecoverMessages = async () => {
    if (!selectedThreadId) return;

    try {
      setIsRecovering(true);
      await chatService.recoverFailedMessages(selectedThreadId);
      await loadMessages();
      toast.showToast({
        title: 'Recovery Complete',
        description: 'Failed messages have been recovered',
        type: 'success'
      });
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

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user || !selectedThreadId) return;

    try {
      await chatService.addReaction(messageId, emoji);
      // Reaction will be reflected through real-time updates
    } catch (err) {
      toast.showToast({
        title: 'Error',
        description: 'Failed to add reaction',
        type: 'error'
      });
    }
  };

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    if (!user || !selectedThreadId) return;

    try {
      await chatService.removeReaction(messageId, emoji);
      // Reaction removal will be reflected through real-time updates
    } catch (err) {
      toast.showToast({
        title: 'Error',
        description: 'Failed to remove reaction',
        type: 'error'
      });
    }
  };

  return (
    <div className={`flex h-full ${className || ''}`}>
      {/* Thread List */}
      <div className="w-1/4 border-r border-gray-200 p-4">
        <ThreadList
          selectedThreadId={selectedThreadId}
          onThreadSelect={handleThreadSelect}
          onCreateThread={() => setShowCreateThread(true)}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedThread ? (
          <>
            {/* Thread Header */}
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {selectedThread.metadata?.title || 'Untitled Thread'}
                  </h2>
                  {selectedThread.metadata?.description && (
                    <p className="text-sm text-gray-500">
                      {selectedThread.metadata.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {/* Participant List */}
                  <div className="flex -space-x-2">
                    {selectedThread.participants.map(participant => (
                      <div
                        key={participant.user.id}
                        className="relative"
                        title={participant.user.name}
                      >
                        <img
                          src={participant.user.avatar || '/default-avatar.png'}
                          alt={participant.user.name}
                          className="w-8 h-8 rounded-full border-2 border-white"
                        />
                        {participants.includes(participant.user.id) && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Message Recovery Status */}
            {failedMessages.length > 0 && (
              <MessageRecoveryStatus
                threadId={selectedThreadId}
                onRecoveryComplete={handleRecoverMessages}
              />
            )}

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Spinner />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-red-500 mb-4">{error.message}</p>
                  <Button
                    variant="secondary"
                    onClick={handleRecoverMessages}
                    disabled={isRecovering}
                  >
                    {isRecovering ? 'Recovering...' : 'Try Again'}
                  </Button>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <p>No messages yet</p>
                  <p className="text-sm">Start a conversation!</p>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <ChatBubble
                      key={message.id}
                      message={message}
                      isOwn={message.sender === user?.id}
                      showAvatar={
                        index === 0 ||
                        messages[index - 1].sender !== message.sender
                      }
                      onReact={handleReaction}
                      onRemoveReaction={handleRemoveReaction}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Attachment Manager */}
            {showAttachments && (
              <div className="border-t border-gray-200 p-4">
                <AttachmentManager
                  threadId={selectedThreadId}
                  messageId={undefined}
                />
              </div>
            )}

            {/* Search Bar */}
            <div className="border-t border-gray-200 p-4">
              <SearchBar
                threadId={selectedThreadId}
                onSearch={handleSearch}
                onClear={handleClearSearch}
                isLoading={isSearching}
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border-t border-gray-200 p-4">
                <SearchResults
                  results={searchResults}
                  hasMore={hasMoreResults}
                  isLoading={isSearching}
                  onLoadMore={handleLoadMore}
                  onJumpToMessage={handleJumpToMessage}
                />
              </div>
            )}

            {/* Chat Input */}
            <div className="border-t border-gray-200 p-4">
              <ChatInput
                threadId={selectedThreadId}
                disabled={!selectedThreadId || isRecovering}
                onSend={handleSendMessage}
                onTyping={(isTyping) => {
                  // Handle typing indicator
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>Select a thread to start chatting</p>
            <Button
              variant="secondary"
              onClick={() => setShowCreateThread(true)}
              className="mt-4"
            >
              Create New Thread
            </Button>
          </div>
        )}
      </div>

      {/* Create Thread Dialog */}
      {showCreateThread && (
        <ThreadCreateDialog
          isOpen={showCreateThread}
          onClose={() => setShowCreateThread(false)}
          availableParticipants={availableParticipants}
          onThreadCreated={handleThreadSelect}
        />
      )}
    </div>
  );
}; 