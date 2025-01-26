import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

import { Client } from '../types/Client'; // Ensure this

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

const ChatPage = () => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Array<Message>>([]);
  const [, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [currentSentiment, setCurrentSentiment] = useState(0);
  const [overallSentiment,] = useState(0);
  const [sessionMode, setSessionMode] = useState<SessionMode>('text');
  const [sessionId,] = useState<string | null>(null);
  const [contextualHints, setContextualHints] = useState<Array<string>>([]);
  const [interventionRecommendations, setInterventionRecommendations] = useState<Array<any>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const { isAuthenticated, user } = await useKindeAuth();
        if (!isAuthenticated || !user) {
          navigate("/auth");
          return;
        }
        
        if (!clientId) {
          navigate("/clients");
          return;
        }

        const response = await fetch(`/api/clients/${clientId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch client');
        }
        const data = await response.json();
        setClient(data);
      } catch (error) {
        console.error('Error fetching client:', error);
        navigate("/clients");
      }
    };
    
    fetchClient();
  }, [navigate, clientId]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !sessionId || !client) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Get contextual information before sending message
      const contextualLearning = ContextualLearningSystem.getInstance();
      const context = await contextualLearning.getContextualResponse(
        client.id.toString(),
        message
      );
      setContextualHints(context.contextualHints);

      // Update session with new message
      const userMessage: Message = { role: 'user', content: message };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setNewMessage("");

      // Get AI response with context
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          sessionId,
          clientId: client.id.toString(),
          context: {
            hints: context.contextualHints,
            approaches: context.suggestedApproaches,
            history: context.relevantHistory,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
      const assistantMessage: Message = { role: 'assistant', content: data.response };
      const newMessages = [...updatedMessages, assistantMessage];
      setMessages(newMessages);

      // Update context with new interaction
      const currentSession = sessionManager.getCurrentSession();
      if (currentSession) {
        await contextualLearning.updateContext(
          client.id.toString(),
          currentSession,
          newMessages,
          client
        );
      }

      // Update sentiment analysis
      const newSentiment = analyzeMessageHistory(newMessages.slice(-5));
      setCurrentSentiment(newSentiment);
      
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

  // Update recommendations when context changes
  useEffect(() => {
    const updateRecommendations = async () => {
      if (!client) {
        return;
      }

      const interventionOptimization = InterventionOptimizationSystem.getInstance();
      const recommendations = await interventionOptimization.recommendIntervention(
        client.id.toString(),
        {
          emotionalState: currentSentiment,
          engagementLevel: messages.length > 0 ? 0.7 : 0, // Simple engagement metric
          recentTopics: contextualHints.map(hint => hint.toLowerCase()),
        }
      );

      setInterventionRecommendations(recommendations);
    };

    updateRecommendations();
  }, [client, currentSentiment, contextualHints, messages]);

  const handleInterventionSelect = async (interventionType: string) => {
    if (!client || !sessionId) {
      return;
    }

    try {
      // Create new intervention
      const intervention = {
        id: crypto.randomUUID(),
        type: interventionType,
        timestamp: Date.now(),
        sessionId,
        clientId: client.id.toString(),
      };

      // Track the intervention
      const interventionOptimization = InterventionOptimizationSystem.getInstance();
      const currentSession = sessionManager.getCurrentSession();

      if (currentSession) {
        await interventionOptimization.trackIntervention(
          client.id.toString(),
          intervention,
          currentSession
        );
      }

      // Add intervention message to chat
      const message = {
        role: 'assistant' as const,
        content: `[Intervention: ${interventionType}] Let's try a different approach...`,
      };
      setMessages(prev => [...prev, message]);

      toast({
        title: 'Intervention Applied',
        description: `${interventionType} intervention has been initiated.`,
      });
    } catch (error) {
      console.error('Error applying intervention:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply intervention. Please try again.',
        variant: 'destructive',
      });
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
            <div className="flex-1 overflow-hidden flex">
              <div className="flex-1 flex flex-col">
                {/* Chat messages */}
                <div className="flex-1 overflow-y-auto p-4">
                  <MessageList messages={messages} />
                  <div ref={messagesEndRef} />
                </div>

                {/* Contextual hints and recommendations */}
                <div className="px-4 space-y-4 mb-4">
                  {contextualHints.length > 0 && (
                    <ContextualHints
                      hints={contextualHints}
                    />
                  )}
                  {interventionRecommendations.length > 0 && (
                    <InterventionRecommendations
                      recommendations={interventionRecommendations}
                      onSelect={handleInterventionSelect}
                    />
                  )}
                </div>

                {/* Message input */}
                <div className="p-4 border-t border-gray-800">
                  <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
                </div>
              </div>
            </div>
            <div className="w-80 border-l border-gray-200 p-4 space-y-4">
              {sessionMode !== 'text' && (
                <VideoChat className="mb-4" />
              )}
              <SentimentIndicator score={overallSentiment} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;