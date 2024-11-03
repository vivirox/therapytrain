import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatHeader from "@/components/ChatHeader";
import ActionButtons from "@/components/ActionButtons";
import ChatInput from "@/components/ChatInput";

const Index = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <ChatHeader />
        
        <div className="flex h-full flex-col items-center justify-between pt-[60px] pb-4">
          <div className="flex-1 w-full max-w-4xl px-4 pt-6">
            <h1 className="mb-8 text-4xl font-semibold text-center">What can I help with?</h1>
            <ActionButtons />
          </div>

          <div className="w-full px-4 pb-2">
            <ChatInput />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;