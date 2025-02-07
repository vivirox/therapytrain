import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { analyzeMessageHistory, analyzeSentiment } from "@/services/sentimentAnalysis";
import { useToast } from "@/components/ui/use-toast";
import MessageList from "@/components/MessageList";
import ChatInput from "@/components/ChatInput";
import ChatSidebar from "@/components/ChatSidebar";
import SessionControls from "@/components/SessionControls";
import VideoChat from "@/components/VideoChat";
import { SentimentIndicator } from "@/components/SentimentIndicator";
import { sessionManager, type SessionMode } from "@/services/sessionManager";
import { ContextualLearningSystem } from "@/services/contextualLearning";
import ContextualHints from "@/components/ContextualHints";
import { InterventionOptimizationSystem } from "@/services/interventionOptimization";
import InterventionRecommendations from "@/components/InterventionRecommendations";
import { api } from "@/services/api";
type Message = {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: number;
};
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
    const [, setNewMessage] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [client, setClient] = useState<Client | null>(null);
    const [currentSentiment, setCurrentSentiment] = useState<number>(0);
    const [overallSentiment] = useState<number>(0);
    const [sessionMode, setSessionMode] = useState<SessionMode>('text');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [contextualHints, setContextualHints] = useState<Array<string>>([]);
    const [interventionRecommendations, setInterventionRecommendations] = useState<Array<any>>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const clientId = location.state?.clientId;
    useEffect(() => {
        const initializeSession = async () => {
            try {
                const { user, isAuthenticated } = useAuth();
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
                const session = await api.sessions.start(clientId, sessionMode);
                setSessionId(session.id);
                await Promise.all([
                    ContextualLearningSystem.getInstance().initialize(session.id),
                    InterventionOptimizationSystem.getInstance().initialize(session.id)
                ]);
                setMessages([{
                        role: 'assistant',
                        content: 'Hello! How can I assist you today?',
                        timestamp: Date.now()
                    }]);
            }
            catch (error) {
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
        try {
            setIsLoading(true);
            const newMessage = {
                role: 'user',
                content,
                timestamp: Date.now()
            };
            setMessages((prevMessages) => [...prevMessages, newMessage as Message]);
            const sentiment = await analyzeSentiment(content);
            setCurrentSentiment(sentiment.score);
            const response = await (api as any).messages.send(sessionId, content);
            const assistantMessage = {
                role: 'assistant' as const,
                content: response.message,
                timestamp: Date.now()
            };
            setMessages((prevMessages) => [...prevMessages, assistantMessage]);
            setIsLoading(false);
        }
        catch (error) {
            console.error('Error sending message:', error);
            toast({
                title: "Error",
                description: "Failed to send message. Please try again.",
                variant: "destructive",
            });
            setIsLoading(false);
        }
    };
    const handleEndSession = async () => {
        if (!sessionId)
            return;
        try {
            await api.sessions.end(sessionId);
            toast({
                title: "Session Ended",
                description: "Your session has been successfully ended.",
            });
            navigate("/dashboard");
        }
        catch (error) {
            console.error('Error ending session:', error);
            toast({
                title: "Error",
                description: "Failed to end session. Please try again.",
                variant: "destructive",
            });
        }
    };
    const handleModeChange = async (newMode: SessionMode) => {
        if (!sessionId)
            return;
        try {
            await api.sessions.switchMode(sessionId, newMode);
            setSessionMode(newMode);
            toast({
                title: "Mode Changed",
                description: `Session mode changed to ${newMode}`,
            });
        }
        catch (error) {
            console.error('Error changing mode:', error);
            toast({
                title: "Error",
                description: "Failed to change session mode. Please try again.",
                variant: "destructive",
            });
        }
    };
    return (<div className="flex h-screen bg-[#0A0A0B]">
      <ChatSidebar mode={sessionMode} onModeChange={handleModeChange} onEndSession={handleEndSession}></ChatSidebar>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-hidden relative">
          <MessageList messages={messages} messagesEndRef={messagesEndRef}></MessageList>
          {sessionMode === 'video' && (<VideoChat sessionId={sessionId || ''}></VideoChat>)}
          <ChatInput sendMessage={handleSendMessage} isLoading={isLoading}></ChatInput>
          {sessionMode === 'text' && (<div className="flex justify-between">
              <ContextualHints hints={contextualHints}></ContextualHints>
              <InterventionRecommendations recommendations={interventionRecommendations}></InterventionRecommendations>
            </div>)}
        </div>
      </div>
    </div>);
};
export default ChatPage;
