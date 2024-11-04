import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatHeader from "@/components/ChatHeader";
import ActionButtons from "@/components/ActionButtons";
import ChatInput from "@/components/ChatInput";

interface Message {
  content: string;
  role: 'user' | 'assistant';
}

const Index = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSendMessage = (content: string) => {
    setMessages([...messages, { role: 'user', content }]);
  };

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <ChatHeader isSidebarOpen={isSidebarOpen} />
        
        <div className={`flex h-full flex-col ${messages.length === 0 ? 'items-center justify-center' : 'justify-between'} pt-[60px] pb-4`}>
          {messages.length === 0 ? (
            <div className="w-full max-w-4xl px-4 space-y-4">
              <div>
                <h1 className="mb-8 text-4xl font-semibold text-center">What can I help with?</h1>
                <ChatInput onSend={handleSendMessage} />
              </div>
              <ActionButtons />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4">
                {messages.map((message, index) => (
                  <div 
                    key={index}
                    className={`py-4 ${message.role === 'assistant' ? 'bg-chatgpt-secondary' : ''}`}
                  >
                    <div className="max-w-4xl mx-auto">
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2">
                <ChatInput onSend={handleSendMessage} />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;