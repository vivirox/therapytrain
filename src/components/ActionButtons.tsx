import { ImagePlus, FileText, BarChart2, Code, HelpCircle } from "lucide-react";

const ActionButtons = () => {
  const actions = [
    { icon: <ImagePlus className="h-4 w-4 text-purple-400" />, label: "Create image" },
    { icon: <FileText className="h-4 w-4 text-blue-400" />, label: "Summarize text" },
    { icon: <BarChart2 className="h-4 w-4 text-green-400" />, label: "Analyze data" },
    { icon: <Code className="h-4 w-4 text-yellow-400" />, label: "Code" },
    { icon: <HelpCircle className="h-4 w-4 text-red-400" />, label: "Get advice" },
  ];

  return (
    <div className="flex gap-2 flex-wrap justify-center mt-4">
      {actions.map((action) => (
        <button 
          key={action.label} 
          className="relative flex h-[42px] items-center gap-1.5 rounded-full border border-[#383737] px-3 py-2 text-start text-[13px] shadow-xxs transition enabled:hover:bg-token-main-surface-secondary disabled:cursor-not-allowed xl:gap-2 xl:text-[14px]"
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  );
};

export default ActionButtons;