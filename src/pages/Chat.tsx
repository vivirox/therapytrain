import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MessageList from "@/components/MessageList";
import ChatInput from "@/components/ChatInput";

const ChatPage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSendMessage = async (message: string) => {
    setIsLoading(true);
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    
    try {
      // TODO: Implement actual AI chat functionality
      // For now, just echo back a response
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "I'm your AI therapist assistant. I'm here to help you practice and improve your therapeutic skills. How can I assist you today?" 
        }]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0B]">
      <div className="flex-1 overflow-hidden flex flex-col">
        <MessageList messages={messages} />
        <div className="p-4 border-t border-gray-800">
          <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;