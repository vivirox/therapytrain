import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { analyzeMessageHistory, analyzeSentiment } from "../services/sentimentAnalysis";
import { useToast } from "../components/ui/use-toast";
import MessageList from "../components/MessageList";
import ChatInput from "../components/ChatInput";
import ChatSidebar from "../components/ChatSidebar";
import SessionControls from "../components/SessionControls";
import VideoChat from "../components/VideoChat";
import { SentimentIndicator } from "../components/SentimentIndicator";
import { sessionManager, type SessionMode } from '../services/sessionManager';
import { ContextualLearningSystem } from '../services/contextualLearning';
import ContextualHints from '../components/ContextualHints';
import { InterventionOptimizationSystem } from '../services/interventionOptimization';
import InterventionRecommendations from '../components/InterventionRecommendations';
import { api } from '../services/api';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface Client {
  id: string;
  name: string;
  lastSession?: string;
}

const ChatPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Array<Message>>([]);
  const [, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [currentSentiment, setCurrentSentiment] = useState(0);
  const [overallSentiment,] = useState(0);
  const [sessionMode, setSessionMode] = useState<SessionMode>('text');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [contextualHints, setContextualHints] = useState<Array<string>>([]);
  const [interventionRecommendations, setInterventionRecommendations] = useState<Array<any>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const clientId = location.state?.clientId;

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const { isAuthenticated, user } = useKindeAuth();
        if (!isAuthenticated || !user) {
          navigate("/auth");
          return;
        }
        
        if (!clientId) {
          toast({
            title: "Error",
            description: "No client selected. Please select a client first.",
            variant: "destructive",
          });
          navigate("/client-selection");
          return;
        }

        // Start a new session
        const session = await api.sessions.start(clientId, sessionMode);
        setSessionId(session.id);

        // Initialize systems
        await Promise.all([
          ContextualLearningSystem.initialize(session.id),
          InterventionOptimizationSystem.initialize(session.id)
        ]);

        // Add initial greeting
        setMessages([{
          role: 'assistant',
          content: 'Hello! How can I assist you today?',
          timestamp: Date.now()
        }]);

      } catch (error) {
        console.error('Error initializing session:', error);
        toast({
          title: "Error",
          description: "Failed to initialize session. Please try again.",
          variant: "destructive",
        });
        navigate("/dashboard");
      }
    };

    initializeSession();
  }, [clientId, navigate, sessionMode, toast]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !sessionId) return;

    try {
      setIsLoading(true);
      setMessages(prev => [...prev, { role: 'user', content, timestamp: Date.now() }]);

      // Analyze sentiment
      const sentiment = await analyzeSentiment(content);
      setCurrentSentiment(sentiment);

      // Update session metrics
      await api.sessions.updateMetrics(sessionId, {
        sentiment: sentiment,
        engagement: 0.8 // TODO: Implement proper engagement tracking
      });

      // Get contextual hints
      const hints = await ContextualLearningSystem.getHints(content);
      setContextualHints(hints);

      // Get intervention recommendations
      const recommendations = await InterventionOptimizationSystem.getRecommendations(content);
      setInterventionRecommendations(recommendations);

      // TODO: Implement AI response generation
      const aiResponse = "I understand. Could you tell me more about that?";
      
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse, timestamp: Date.now() }]);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;

    try {
      await api.sessions.end(sessionId);
      toast({
        title: "Session Ended",
        description: "Your session has been successfully ended.",
      });
      navigate("/dashboard");
    } catch (error) {
      console.error('Error ending session:', error);
      toast({
        title: "Error",
        description: "Failed to end session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleModeChange = async (newMode: SessionMode) => {
    if (!sessionId) return;

    try {
      await api.sessions.switchMode(sessionId, newMode);
      setSessionMode(newMode);
      toast({
        title: "Mode Changed",
        description: `Session mode changed to ${newMode}`,
      });
    } catch (error) {
      console.error('Error changing mode:', error);
      toast({
        title: "Error",
        description: "Failed to change session mode. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen bg-[#0A0A0B]">
      <ChatSidebar
        sessionMode={sessionMode}
        onModeChange={handleModeChange}
        onEndSession={handleEndSession}
      />
      
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-hidden relative">
          <MessageList
            messages={messages}
            isLoading={isLoading}
            messagesEndRef={messagesEndRef}
          />
          
          <div className="absolute top-4 right-4">
            <SentimentIndicator
              currentSentiment={currentSentiment}
              overallSentiment={overallSentiment}
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-800">
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>

      <div className="w-80 border-l border-gray-800 p-4 overflow-y-auto">
        <SessionControls
          sessionMode={sessionMode}
          onModeChange={handleModeChange}
          onEndSession={handleEndSession}
        />
        
        {sessionMode === 'video' && (
          <VideoChat />
        )}
        
        <ContextualHints hints={contextualHints} />
        <InterventionRecommendations recommendations={interventionRecommendations} />
      </div>
    </div>
  );
};

export default ChatPage;