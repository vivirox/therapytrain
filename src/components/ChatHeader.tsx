import { ChevronDown } from "lucide-react";

interface ChatHeaderProps {
  isSidebarOpen?: boolean;
}

const ChatHeader = ({ isSidebarOpen = true }: ChatHeaderProps) => {
  return (
    <div className="fixed top-0 z-30 w-full border-b border-white/20 bg-chatgpt-main/95 backdrop-blur">
      <div className="flex h-[60px] items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${!isSidebarOpen ? 'ml-24' : ''}`}>ClaudeGPT</span>
          <ChevronDown className="h-4 w-4" />
        </div>
        <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center overflow-hidden">
          <img 
            src="https://compareaimodels.com/content/images/2024/08/claude-ai-square-1.svg" 
            alt="Claude AI Logo"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;