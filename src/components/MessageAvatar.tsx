const MessageAvatar = ({ isAssistant }: { isAssistant: boolean }) => {
  if (isAssistant) {
    return (
      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
        <img 
          src="https://compareaimodels.com/content/images/2024/08/claude-ai-square-1.svg" 
          alt="Claude AI Logo"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  
  return null;
};

export default MessageAvatar;