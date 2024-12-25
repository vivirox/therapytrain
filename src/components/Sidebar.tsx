import { Menu, Globe, ChevronDown, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onApiKeyChange: (apiKey: string) => void;
}

const Sidebar = ({ isOpen, onToggle, onApiKeyChange }: SidebarProps) => {
  const [apiKey, setApiKey] = useState("");
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

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newApiKey = e.target.value;
    setApiKey(newApiKey);
    onApiKeyChange(newApiKey);
  };

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
          <button className="flex items-center gap-2 rounded-lg px-3 py-1 text-sm hover:bg-token-sidebar-surface-secondary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="icon-xl-heavy">
              <path d="M15.6729 3.91287C16.8918 2.69392 18.8682 2.69392 20.0871 3.91287C21.3061 5.13182 21.3061 7.10813 20.0871 8.32708L14.1499 14.2643C13.3849 15.0293 12.3925 15.5255 11.3215 15.6785L9.14142 15.9899C8.82983 16.0344 8.51546 15.9297 8.29289 15.7071C8.07033 15.4845 7.96554 15.1701 8.01005 14.8586L8.32149 12.6785C8.47449 11.6075 8.97072 10.615 9.7357 9.85006L15.6729 3.91287ZM18.6729 5.32708C18.235 4.88918 17.525 4.88918 17.0871 5.32708L11.1499 11.2643C10.6909 11.7233 10.3932 12.3187 10.3014 12.9613L10.1785 13.8215L11.0386 13.6986C11.6812 13.6068 12.2767 13.3091 12.7357 12.8501L18.6729 6.91287C19.1108 6.47497 19.1108 5.76499 18.6729 5.32708ZM11 3.99929C11.0004 4.55157 10.5531 4.99963 10.0008 5.00007C9.00227 5.00084 8.29769 5.00827 7.74651 5.06064C7.20685 5.11191 6.88488 5.20117 6.63803 5.32695C6.07354 5.61457 5.6146 6.07351 5.32698 6.63799C5.19279 6.90135 5.10062 7.24904 5.05118 7.8542C5.00078 8.47105 5 9.26336 5 10.4V13.6C5 14.7366 5.00078 15.5289 5.05118 16.1457C5.10062 16.7509 5.19279 17.0986 5.32698 17.3619C5.6146 17.9264 6.07354 18.3854 6.63803 18.673C6.90138 18.8072 7.24907 18.8993 7.85424 18.9488C8.47108 18.9992 9.26339 19 10.4 19H13.6C14.7366 19 15.5289 18.9992 16.1458 18.9488C16.7509 18.8993 17.0986 18.8072 17.362 18.673C17.9265 18.3854 18.3854 17.9264 18.673 17.3619C18.7988 17.1151 18.8881 16.7931 18.9393 16.2535C18.9917 15.7023 18.9991 14.9977 18.9999 13.9992C19.0003 13.4469 19.4484 12.9995 20.0007 13C20.553 13.0004 21.0003 13.4485 20.9999 14.0007C20.9991 14.9789 20.9932 15.7808 20.9304 16.4426C20.8664 17.116 20.7385 17.7136 20.455 18.2699C19.9757 19.2107 19.2108 19.9756 18.27 20.455C17.6777 20.7568 17.0375 20.8826 16.3086 20.9421C15.6008 21 14.7266 21 13.6428 21H10.3572C9.27339 21 8.39925 21 7.69138 20.9421C6.96253 20.8826 6.32234 20.7568 5.73005 20.455C4.78924 19.9756 4.02433 19.2107 3.54497 18.2699C3.24318 17.6776 3.11737 17.0374 3.05782 16.3086C2.99998 15.6007 2.99999 14.7266 3 13.6428V10.3572C2.99999 9.27337 2.99998 8.39922 3.05782 7.69134C3.11737 6.96249 3.24318 6.3223 3.54497 5.73001C4.02433 4.7892 4.78924 4.0243 5.73005 3.54493C6.28633 3.26149 6.88399 3.13358 7.55735 3.06961C8.21919 3.00673 9.02103 3.00083 9.99922 3.00007C10.5515 2.99964 10.9996 3.447 11 3.99929Z" fill="currentColor"/>
            </svg>
          </button>
        </div>

        <div className="flex-col flex-1 transition-opacity duration-500 relative -mr-2 pr-2 overflow-y-auto">
          {isOpen && (
            <div className="p-2 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-4 w-4" />
                <span className="text-sm">API Key</span>
              </div>
              <Input
                type="password"
                placeholder="Enter your API key"
                value={apiKey}
                onChange={handleApiKeyChange}
                className="bg-[#2F2F2F] border-none"
              />
            </div>
          )}

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

        {isOpen && (
          <div className="flex flex-col py-2 border-t border-white/20">
            <button className="group flex gap-2 p-2.5 text-sm items-start hover:bg-token-sidebar-surface-secondary rounded-lg px-2 text-left w-full min-w-[200px]">
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
        )}
      </nav>
    </div>
  );
};

export default Sidebar;