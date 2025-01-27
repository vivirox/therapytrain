import Message from './Message';
import { MdChat as MessageCircle } from 'react-icons/md';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const MessageList = ({ messages }: { messages: Message[] }) => {
  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="bg-chatgpt-hover p-4 rounded-full inline-block">
            <MessageCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-semibold">Start a Conversation</h2>
          <p className="text-gray-400">Send a message to begin your therapy session</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="w-full max-w-3xl mx-auto px-4">
        {messages.map((message, index) => (
          <Message key={index} {...message} />
        ))}
      </div>
    </div>
  );
};

export default MessageList;