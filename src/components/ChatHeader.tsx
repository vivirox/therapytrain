import { ChevronDown } from "lucide-react";

const ChatHeader = () => {
  return (
    <div className="fixed top-0 z-[60] w-full border-b border-white/20 bg-chatgpt-main/95 backdrop-blur">
      <div className="flex h-[60px] items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold">ChatGPT</span>
          <ChevronDown className="h-4 w-4" />
        </div>
        <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center">
          H
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;