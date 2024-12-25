import MessageAvatar from './MessageAvatar';
import MessageActions from './MessageActions';

type MessageProps = {
  role: 'user' | 'assistant';
  content: string;
};

const Message = ({ role, content }: MessageProps) => {
  return (
    <div className="py-6">
      <div className={`flex gap-4 ${role === 'user' ? 'flex-row-reverse' : ''}`}>
        <MessageAvatar isAssistant={role === 'assistant'} />
        <div className={`flex-1 space-y-2 ${role === 'user' ? 'flex justify-end' : ''}`}>
          <div className={`${role === 'user' ? 'bg-gray-700/50 rounded-[20px] px-4 py-2 inline-block' : ''}`}>
            {content}
          </div>
          {role === 'assistant' && <MessageActions />}
        </div>
      </div>
    </div>
  );
};

export default Message;