import { Message } from "@/types/message";

interface MessagesProps {
  messages: Message[];
}

const Messages = ({ messages }: MessagesProps) => {
  return (
    <div className="flex flex-col space-y-4 w-full max-w-3xl">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${
            message.role === "assistant" ? "bg-chatgpt-secondary" : ""
          } p-4 rounded-lg`}
        >
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">
              {message.role === "assistant" ? "Assistant" : "You"}
            </p>
            <p className="text-sm">{message.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Messages;