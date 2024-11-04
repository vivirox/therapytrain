import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatHeader from "@/components/ChatHeader";
import ActionButtons from "@/components/ActionButtons";
import ChatInput from "@/components/ChatInput";

const Index = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <ChatHeader isSidebarOpen={isSidebarOpen} />
        
        <div className="flex h-full flex-col items-center justify-center pt-[60px] pb-4">
          <div className="w-full max-w-4xl px-4 space-y-4">
            <div>
              <h1 className="mb-8 text-4xl font-semibold text-center">What can I help with?</h1>
              <ChatInput />
            </div>
            <ActionButtons />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;