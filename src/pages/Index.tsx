import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatHeader from "@/components/ChatHeader";
import ChatInput from "@/components/ChatInput";
import Messages from "@/components/Messages";

const Index = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi there! How can I help you today?" },
  ]);

  const handleSendMessage = (message: string) => {
    setShowWelcome(false);
    setMessages([
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "This is a hardcoded response for testing purposes." },
    ]);
  };

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <ChatHeader isSidebarOpen={isSidebarOpen} />
        
        <div className="flex h-full flex-col pt-[60px]">
          {showWelcome ? (
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="w-full max-w-4xl space-y-4">
                <h1 className="mb-8 text-4xl font-semibold text-center">What can I help with?</h1>
                <ChatInput onSendMessage={handleSendMessage} />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <Messages messages={messages} />
            </div>
          )}
          
          {!showWelcome && (
            <div className="p-4 border-t border-white/20">
              <div className="max-w-4xl mx-auto">
                <ChatInput onSendMessage={handleSendMessage} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;