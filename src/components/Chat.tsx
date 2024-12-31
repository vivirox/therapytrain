import { XIcon } from '@heroicons/react/solid';
import { FC, useState, useEffect } from 'react';
import { generateResponse } from '../lib/ollama';
import { supabase } from '../lib/supabase';
import { Toast } from './Toast';
import { ErrorBoundary } from './ErrorBoundary';

const clientContext = JSON.parse(localStorage.getItem('clientContext') || '{}');

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  sessionId: string;
  reactions?: Array<string>;  // New field
}

interface ChatProps {
  threadId: string;
}
export const Chat: FC<ChatProps> = ({ threadId }): JSX.Element => {
  const clientContext = JSON.parse(localStorage.getItem('clientContext') || '{}');
  const [messages, setMessages] = useState<Array<Message>>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const sessionId = crypto.randomUUID();
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel('messages')
      .on('system', { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages(prev => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const loadChatHistory = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    try {
      setIsLoading(true);
      setIsTyping(true);
      await sendMessage();
      setToastMessage({ text: 'Message sent successfully', type: 'success' });
    } catch (error) {
      setToastMessage({ text: 'Failed to send message', type: 'error' });
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const sendMessage = async () => {
    const message: Message = {
      id: crypto.randomUUID(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
      sessionId
    };

    await supabase.from('messages').insert([message]);
    setReplyToMessage(null);
    setMessages(prev => [...prev, message]);
    setInputText('');

    const aiResponse = await generateResponse(inputText, {
      name: clientContext.name,
      age: clientContext.age,
      primaryIssue: clientContext.primaryIssue,
      background: clientContext.background,
      keyTraits: clientContext.keyTraits,
      complexity: clientContext.complexity
    });

    const aiMessage: Message = {
      id: crypto.randomUUID(),
      text: aiResponse.response,
      sender: 'ai',
      timestamp: new Date(),
      sessionId
    };

    await supabase.from('messages').insert([aiMessage]);
    setMessages(prev => [...prev, aiMessage]);
  };

  const ReplyMessage: FC<{
    message: Message;
    onClose: () => void;
  }> = ({ message, onClose }) => (
    <div className="reply-message">
      Replying to: {message.text}
      <button
        className="close-button"
        onClick={onClose}
        aria-label="Close reply"
        role="button"
      >
        <XIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>

  );

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen">
        {replyToMessage && (
          <ReplyMessage
            message={replyToMessage}
            onClose={() => setReplyToMessage(null)}
          />
        )}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`mb-4 ${msg.sender === 'user' ? 'ml-auto' : 'mr-auto'}`}
            >
              <div
                className={`p-3 rounded-lg ${msg.sender === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-800'
                  }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          )}
        </div>
        <div className="border-t p-4 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 p-2 rounded border"
              placeholder="Type a message..."
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              className={`px-4 py-2 rounded ${isLoading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
                } text-white`}
              disabled={isLoading}
            >
              Send
            </button>
          </div>
        </div>
        {toastMessage && (
          <Toast message={toastMessage.text} type={toastMessage.type} />
        )}
        {isTyping && (
          <div className="flex items-center space-x-2 p-4">
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};