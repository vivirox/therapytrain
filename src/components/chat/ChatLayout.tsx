import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { chatService } from '/home/vivi/therapytrain/src/services/chat.ts';
import { ChatHistory } from './ChatHistory';
import { ChatInterface } from './ChatInterface';
import { ChatSession, Message } from '@/types/chat';

const ChatLayout: React.FC = () => {
  const { session } = useAuth();
  const [sessions, setSessions] = useState<Array<ChatSession>>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Array<Message>>([]);

  useEffect(() => {
    if (session?.user) {
      chatService.getSessions(session.user.id).then(setSessions);
    }
  }, [session]);

  const handleSessionSelect = async (sessionId: string) => {
    const selectedSession = sessions.find(s => s.id === sessionId);
    if (!selectedSession) {
      return;
    }
    setCurrentSession(selectedSession);
    const sessionMessages = await chatService.getSessionMessages(sessionId);
    setMessages(sessionMessages);
  };

  return (
    <div className="flex h-screen bg-[#0A0A0B]">
      <ChatHistory 
        sessions={sessions}
        currentSessionId={currentSession?.id || null}
        onSelectSession={handleSessionSelect}
      />
      <div className="flex-1">
        <ChatInterface 
          currentSession={currentSession}
          messages={messages}
          onMessagesUpdate={setMessages} 
        />
      </div>
    </div>
  );
};
interface ChatInterfaceProps {
  currentSession: ChatSession;
  messages: Array<Message>;
  onMessagesUpdate: (messages: Array<Message>) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  currentSession,
  messages,
  onMessagesUpdate,
}) => {
}
export default ChatLayout;
