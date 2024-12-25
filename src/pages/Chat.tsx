import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MessageList from "@/components/MessageList";
import ChatInput from "@/components/ChatInput";
import ChatSidebar from "@/components/ChatSidebar";
import { useToast } from "@/components/ui/use-toast";

type Client = {
  id: number;
  name: string;
  age: number;
  primary_issue: string;
  complexity: string;
  description: string;
  key_traits: Array<string>;
  background: string;
};

const ChatPage = () => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [client, setClient] = useState<Client | null>(null);

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
      // Using your existing chat-completion endpoint
      const response = await fetch('/functions/v1/chat-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          message,
          // Include client context for better role-playing
          clientContext: {
            name: client.name,
            age: client.age,
            primaryIssue: client.primary_issue,
            background: client.background,
            keyTraits: client.key_traits,
            complexity: client.complexity
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.content || data.message || data.response
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
    <div className="flex h-screen bg-[#0A0A0B]">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-hidden flex flex-col">
          <MessageList messages={messages} />
          <div className="p-4 border-t border-gray-800">
            <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
          </div>
        </div>
      </div>
      <ChatSidebar client={client} />
    </div>
  );
};

export default ChatPage;