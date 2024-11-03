import { ImagePlus, FileText, BarChart2, Code, HelpCircle, MoreHorizontal } from "lucide-react";

const ActionButtons = () => {
  const actions = [
    { icon: <ImagePlus className="h-4 w-4 text-purple-400" />, label: "Create image" },
    { icon: <FileText className="h-4 w-4 text-blue-400" />, label: "Summarize text" },
    { icon: <BarChart2 className="h-4 w-4 text-green-400" />, label: "Analyze data" },
    { icon: <Code className="h-4 w-4 text-yellow-400" />, label: "Code" },
    { icon: <HelpCircle className="h-4 w-4 text-red-400" />, label: "Get advice" },
  ];

  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {actions.map((action) => (
        <button 
          key={action.label} 
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm hover:bg-chatgpt-hover/50 border border-[#383737] transition-all duration-200"
        >
          {action.icon}
          {action.label}
        </button>
      ))}
      <button className="flex items-center gap-2 rounded-full px-4 py-2 text-sm hover:bg-chatgpt-hover/50 border border-[#383737] transition-all duration-200">
        <MoreHorizontal className="h-4 w-4 text-gray-400" />
        More
      </button>
    </div>
  );
};

export default ActionButtons;