import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatHeader from "@/components/ChatHeader";
import ChatInput from "@/components/ChatInput";
import Messages from "@/components/Messages";
import { Message } from "@/types/message";

const Index = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);

  const handleSendMessage = (content: string) => {
    const userMessage: Message = { role: "user", content };
    const assistantMessage: Message = {
      role: "assistant",
      content: "This is a hardcoded response for now. The assistant would normally process your message and respond accordingly.",
    };
    
    setMessages([...messages, userMessage, assistantMessage]);
    setShowWelcome(false);
  };

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <ChatHeader isSidebarOpen={isSidebarOpen} />
        
        <div className="flex h-full flex-col items-center pt-[60px] pb-4">
          {showWelcome ? (
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl px-4 space-y-4">
              <h1 className="mb-8 text-4xl font-semibold text-center">What can I help with?</h1>
            </div>
          ) : (
            <div className="flex-1 w-full max-w-4xl px-4 overflow-y-auto">
              <Messages messages={messages} />
            </div>
          )}
          
          <div className="w-full max-w-4xl px-4 mt-4">
            <ChatInput onSendMessage={handleSendMessage} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;