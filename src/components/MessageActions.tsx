import { MdVolumeUp, MdThumbUp, MdThumbDown, MdContentCopy, MdRefresh, MdMoreHoriz } from "react-icons/md";

const MessageActions = () => {
  return (
    <div className="flex items-center gap-2 text-gray-400">
      <button className="p-1 hover:text-white transition-colors">
        <MdVolumeUp className="h-4 w-4" />
      </button>
      <button className="p-1 hover:text-white transition-colors">
        <MdThumbUp className="h-4 w-4" />
      </button>
      <button className="p-1 hover:text-white transition-colors">
        <MdThumbDown className="h-4 w-4" />
      </button>
      <button className="p-1 hover:text-white transition-colors">
        <MdContentCopy className="h-4 w-4" />
      </button>
      <button className="p-1 hover:text-white transition-colors">
        <MdRefresh className="h-4 w-4" />
      </button>
      <button className="p-1 hover:text-white transition-colors">
        <MdMoreHoriz className="h-4 w-4" />
      </button>
    </div>
  );
};

export default MessageActions;