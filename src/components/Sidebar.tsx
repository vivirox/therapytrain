import { Menu, Plus, Globe, Clock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const timeframes = [
    { title: "Yesterday", items: ["Using Tailwind CSS Guide"] },
    { 
      title: "Previous 7 Days", 
      items: [
        "Likeable and Inception Levels",
        "Viral Figma Board Ideas",
        "RAG Status in Software Dev",
        "Image Input ChatGPT API"
      ] 
    },
    {
      title: "Previous 30 Days",
      items: [
        "Focus on Lovable Viral",
        "Create Twitter Clone",
        "Reddit Posting Guidelines",
        "Revamping Social Features",
        "US AI Voting Logo"
      ]
    }
  ];

  return (
    <div className={cn(
      "fixed top-0 left-0 z-40 h-screen bg-chatgpt-sidebar transition-all duration-300",
      isOpen ? "w-64" : "w-0"
    )}>
      <div className="flex h-full flex-col">
        <div className="flex h-[60px] items-center justify-between px-3">
          <button onClick={onToggle} className="p-2 hover:bg-chatgpt-hover rounded-md">
            <Menu className="h-5 w-5" />
          </button>
          <button className="flex items-center gap-2 rounded-md border border-white/20 px-3 py-1 text-sm hover:bg-chatgpt-hover">
            <Plus className="h-4 w-4" />
            New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-2 px-2 py-2">
            <div className="sidebar-item">
              <Globe className="h-4 w-4" />
              ChatGPT
            </div>
            <div className="sidebar-item">
              <Globe className="h-4 w-4" />
              Explore GPTs
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 px-2">
            {timeframes.map((timeframe) => (
              <div key={timeframe.title}>
                <div className="px-3 py-2 text-xs text-gray-500">{timeframe.title}</div>
                {timeframe.items.map((item) => (
                  <div key={item} className="sidebar-item">
                    <Clock className="h-4 w-4" />
                    {item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/20 p-2">
          <button className="sidebar-item w-full">
            Upgrade plan
            <span className="ml-auto text-xs text-gray-500">More access to the best models</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;