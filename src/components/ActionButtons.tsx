import { ImagePlus, FileText, BarChart2, Code, HelpCircle, MoreHorizontal } from "lucide-react";

const ActionButtons = () => {
  const actions = [
    { icon: <ImagePlus className="h-4 w-4" />, label: "Create image" },
    { icon: <FileText className="h-4 w-4" />, label: "Summarize text" },
    { icon: <BarChart2 className="h-4 w-4" />, label: "Analyze data" },
    { icon: <Code className="h-4 w-4" />, label: "Code" },
    { icon: <HelpCircle className="h-4 w-4" />, label: "Get advice" },
  ];

  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {actions.map((action) => (
        <button key={action.label} className="action-button">
          {action.icon}
          {action.label}
        </button>
      ))}
      <button className="action-button">
        <MoreHorizontal className="h-4 w-4" />
        More
      </button>
    </div>
  );
};

export default ActionButtons;