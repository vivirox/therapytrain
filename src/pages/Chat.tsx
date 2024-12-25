import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MessageList from "@/components/MessageList";
import ChatInput from "@/components/ChatInput";
import Sidebar from "@/components/Sidebar";
import { useToast } from "@/components/ui/use-toast";

type Client = {
  id: number;
  name: string;
  age: number;
  primary_issue: string;
  complexity: string;
  description: string;
  key_traits: string[];
  background: string;
};

const ChatPage = () => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { toast } = useToast();
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      if (!clientId) {
        navigate("/clients");
        return;
      }

      const { data, error } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error || !data) {
        console.error('Error fetching client:', error);
        navigate("/clients");
        return;
      }

      setClient(data);
    };
    
    checkAuth();
  }, [navigate, clientId]);

  const handleSendMessage = async (message: string) => {
    if (!client) return;
    
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    
    try {
      const response = await fetch('/functions/v1/chat-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ message, clientContext: client }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.message || data.response || "I apologize, but I couldn't generate a proper response." 
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to get response from AI. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!client) {
    return null;
  }

  return (
    <div className="flex h-screen bg-chatgpt-main">
      <Sidebar 
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onApiKeyChange={setApiKey}
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="flex-1 overflow-hidden flex flex-col">
          <MessageList messages={messages} />
          <div className="p-4 border-t border-gray-800">
            <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;