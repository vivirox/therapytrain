import { ThumbsUp, ThumbsDown, Copy, Volume2, RotateCcw } from "lucide-react";

interface Message {
  role: "assistant" | "user";
  content: string;
}

const Messages = ({ messages }: { messages: Message[] }) => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`py-6 px-4 ${
            message.role === "assistant" ? "bg-chatgpt-secondary" : ""
          }`}
        >
          <div className="flex max-w-4xl mx-auto gap-4 items-start">
            <div className="w-8 h-8 rounded-full flex items-center justify-center">
              {message.role === "assistant" ? (
                <div className="bg-green-600 rounded-full w-full h-full flex items-center justify-center">
                  AI
                </div>
              ) : (
                <div className="bg-orange-500 rounded-full w-full h-full flex items-center justify-center">
                  H
                </div>
              )}
            </div>
            <div className="flex-1 space-y-4">
              <p className="text-white">{message.content}</p>
              {message.role === "assistant" && (
                <div className="flex items-center gap-4 text-gray-400">
                  <button className="hover:text-white">
                    <Volume2 className="h-4 w-4" />
                  </button>
                  <button className="hover:text-white">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button className="hover:text-white">
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button className="hover:text-white">
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                  <button className="hover:text-white">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Messages;