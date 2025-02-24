import { ThreadList, ThreadCreateDialog } from '../ThreadList';
import { ThreadWithMetadata } from '../../../types/thread';

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
  const [selectedThread, setSelectedThread] = useState<ThreadWithMetadata | null>(null);
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [availableParticipants, setAvailableParticipants] = useState<UserProfile[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const toast = useToast();
  const supabase = useSupabaseClient();
  const zkService = ZKService.getInstance();
  const chatService = ChatService.getInstance();
  const searchService = MessageSearchService.getInstance(supabase, redis);
  const threadService = ThreadManagementService.getInstance(supabase, redis);
  
  const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/chat`;
  const { sendMessage, lastMessage, connectionStatus } = useWebSocket(wsUrl, {
    threadId: selectedThreadId || undefined,
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
        if (message.threadId === selectedThreadId) {
          setMessages(prev => [...prev, message]);
          scrollToBottom();
        }

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
  }, [selectedThreadId, supabase]);

  const handleSendMessage = async (content: string) => {
    if (!user || !content.trim() || !selectedThreadId) return;

    const message: Message = {
      id: crypto.randomUUID(),
      threadId: selectedThreadId,
      senderId: user.id,
      recipientId: selectedThread?.participants.find(p => p.user.id !== user.id)?.user.id || '',
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

  const handleThreadSelect = (threadId: string) => {
    setSelectedThreadId(threadId);
    // Clear search results when switching threads
    setSearchResults([]);
    setCurrentSearch(null);
    setSearchOffset(0);
    setHasMoreResults(false);
  };

  const handleThreadCreated = (threadId: string) => {
    setShowCreateThread(false);
    handleThreadSelect(threadId);
  };

  // ... rest of the existing code ...

  return (
    <div className={`flex h-full ${className}`}>
      {/* Thread List */}
      <div className="w-80 border-r flex flex-col">
        <ThreadList
          selectedThreadId={selectedThreadId || undefined}
          onThreadSelect={handleThreadSelect}
          onCreateThread={() => setShowCreateThread(true)}
          className="flex-1"
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedThread ? (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {selectedThread.metadata.title || 'Untitled Thread'}
                  </h2>
                  {selectedThread.metadata.description && (
                    <p className="text-sm text-gray-500">
                      {selectedThread.metadata.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {selectedThread.participants.map(participant => (
                    <div
                      key={participant.user.id}
                      className="flex items-center space-x-1"
                    >
                      <span className="text-sm">
                        {participant.user.name || participant.user.email}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({participant.role})
                      </span>
                      <span className={`
                        w-2 h-2 rounded-full
                        ${participants.includes(participant.user.id) ? 'bg-green-500' : 'bg-gray-300'}
                      `} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Message Recovery Status */}
            <MessageRecoveryStatus 
              threadId={selectedThreadId}
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
                    threadId={selectedThreadId}
                    messageId={undefined}
                  />
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="border-b p-4">
              <SearchBar
                threadId={selectedThreadId}
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">
                Select a thread to start chatting
              </h2>
              <p className="text-gray-500 mb-4">
                Or create a new thread to begin a conversation
              </p>
              <Button
                variant="primary"
                onClick={() => setShowCreateThread(true)}
              >
                Create New Thread
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Thread Dialog */}
      <ThreadCreateDialog
        isOpen={showCreateThread}
        onClose={() => setShowCreateThread(false)}
        onThreadCreated={handleThreadCreated}
        availableParticipants={availableParticipants}
      />

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
    </div>
  );
}; 