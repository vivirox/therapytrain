import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MessageList from "@/components/MessageList";
import ChatInput from "@/components/ChatInput";
import ChatSidebar from "@/components/ChatSidebar";
import SentimentTrends from "@/components/SentimentTrends";
import BehavioralPatterns from "@/components/BehavioralPatterns";
import SessionControls from "@/components/SessionControls";
import VideoChat from "@/components/VideoChat";
import SessionComparison from "@/components/SessionComparison";
import InterventionEffectiveness from "@/components/InterventionEffectiveness";
import RiskAssessment from "@/components/RiskAssessment";
import { useToast } from "@/components/ui/use-toast";
import { SentimentIndicator } from "@/components/SentimentIndicator";
import { analyzeMessageHistory, analyzeSentiment, getSentimentTrends, type SentimentTrend } from "@/services/sentimentAnalysis";
import type { SessionMode } from "@/services/sessionManager";

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
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; timestamp?: number; }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [currentSentiment, setCurrentSentiment] = useState(0);
  const [overallSentiment, setOverallSentiment] = useState(0);
  const [sentimentTrends, setSentimentTrends] = useState<SentimentTrend[]>([]);
  const [sessionMode, setSessionMode] = useState<SessionMode>('text');
  const [sessionId, setSessionId] = useState<string | null>(null);

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
        .eq('id', parseInt(clientId!))
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
    try {
      setIsLoading(true);
      
      // Add user message with timestamp
      const newMessage = { 
        role: 'user' as const, 
        content: message,
        timestamp: Date.now()
      };
      const newMessages = [...messages, newMessage];
      setMessages(newMessages);
      
      // Analyze sentiment
      const sentimentAnalysis = analyzeSentiment(message);
      setCurrentSentiment(sentimentAnalysis.score);
      
      // Check for sentiment alerts
      if (sentimentAnalysis.alert) {
        toast({
          title: "Sentiment Alert",
          description: "This message contains concerning content that may require immediate attention.",
          variant: "destructive"
        });
      }
      
      // Update overall sentiment and trends
      const overallScore = analyzeMessageHistory(newMessages);
      setOverallSentiment(overallScore);
      setSentimentTrends(getSentimentTrends(newMessages));

      // Get AI response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message,
          clientId,
          history: messages
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const newAssistantMessage = { 
        role: 'assistant' as const, 
        content: data.message,
        timestamp: Date.now()
      };
      setMessages([...newMessages, newAssistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
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
    <div className="flex h-screen">
      <ChatSidebar client={client} />
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <SessionControls 
            clientId={clientId!} 
            onModeChange={setSessionMode}
          />
        </div>
        <div className="flex-1 flex">
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-auto p-4">
              <MessageList messages={messages} />
            </div>
            <div className="p-4 border-t">
              <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
            </div>
          </div>
          <div className="w-80 border-l border-gray-200 p-4 space-y-4">
            {sessionMode !== 'text' && (
              <VideoChat className="mb-4" />
            )}
            <RiskAssessment
              sessionId={sessionId}
              clientId={clientId!}
            />
            <SentimentTrends trends={sentimentTrends} />
            <BehavioralPatterns clientId={clientId!} />
            <SessionComparison 
              clientId={clientId!}
              sessionId={sessionId}
            />
            <InterventionEffectiveness
              sessionId={sessionId}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;