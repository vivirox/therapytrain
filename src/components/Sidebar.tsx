import { Menu, Plus, Globe, ChevronDown } from "lucide-react";
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
      <nav className="flex h-full w-full flex-col px-3" aria-label="Chat history">
        <div className="flex justify-between flex h-[60px] items-center">
          <button onClick={onToggle} className="h-10 rounded-lg px-2 text-token-text-secondary hover:bg-token-sidebar-surface-secondary">
            <Menu className="h-5 w-5" />
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-1 text-sm hover:bg-token-sidebar-surface-secondary">
            <Plus className="h-4 w-4" />
            New chat
          </button>
        </div>

        <div className="flex-col flex-1 transition-opacity duration-500 relative -mr-2 pr-2 overflow-y-auto">
          <div className="bg-token-sidebar-surface-primary pt-0">
            <div className="flex flex-col gap-2 px-2 py-2">
              <div className="group flex h-10 items-center gap-2.5 rounded-lg px-2 hover:bg-token-sidebar-surface-secondary cursor-pointer">
                <div className="h-6 w-6 flex items-center justify-center">
                  <Globe className="h-4 w-4" />
                </div>
                <span className="text-sm">ChatGPT</span>
              </div>
              <div className="group flex h-10 items-center gap-2.5 rounded-lg px-2 hover:bg-token-sidebar-surface-secondary cursor-pointer">
                <div className="h-6 w-6 flex items-center justify-center">
                  <Globe className="h-4 w-4" />
                </div>
                <span className="text-sm">Explore GPTs</span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              {timeframes.map((timeframe) => (
                <div key={timeframe.title}>
                  <div className="px-3 py-2 text-xs text-gray-500">{timeframe.title}</div>
                  {timeframe.items.map((item) => (
                    <div key={item} className="group flex h-10 items-center gap-2.5 rounded-lg px-2 hover:bg-token-sidebar-surface-secondary cursor-pointer">
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col py-2 border-t border-white/20">
          <button className="group flex gap-2 p-2.5 text-sm items-center hover:bg-token-sidebar-surface-secondary rounded-lg px-2">
            <span className="flex w-full flex-row flex-wrap-reverse justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-token-border-light">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon-sm">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12.5001 3.44338C12.1907 3.26474 11.8095 3.26474 11.5001 3.44338L4.83984 7.28868C4.53044 7.46731 4.33984 7.79744 4.33984 8.1547V15.8453C4.33984 16.2026 4.53044 16.5327 4.83984 16.7113L11.5001 20.5566C11.8095 20.7353 12.1907 20.7353 12.5001 20.5566L19.1604 16.7113C19.4698 16.5327 19.6604 16.2026 19.6604 15.8453V8.1547C19.6604 7.79744 19.4698 7.46731 19.1604 7.28868L12.5001 3.44338Z" fill="currentColor"/>
                  </svg>
                </span>
                <div className="flex flex-col">
                  <span>Upgrade plan</span>
                  <span className="line-clamp-1 text-xs text-token-text-tertiary">More access to the best models</span>
                </div>
              </div>
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;
