import React, { useEffect, useRef } from 'react';
import { useChat } from "@/../contexts/ChatContext";
import { Message } from "@/../../../backend/src/types/chat";
import { Avatar } from "@/ui/avatar";
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
function MessageItem({ message }: {
    message: Message;
}) {
    const isAI = message.type === 'ai';
    const isSystem = message.type === 'system';
    return (<div className={`flex gap-3 ${isSystem ? 'justify-center' : isAI ? 'justify-start' : 'justify-end'} mb-4`}>
      {isSystem ? (<div className="bg-gray-100 rounded-lg py-2 px-4 text-sm text-gray-600">
          {message.payload.content}
        </div>) : (<>
          {isAI && (<Avatar className="h-8 w-8" src="/ai-avatar.png" alt="AI Assistant"/>)}
          <div className={`flex flex-col ${isAI ? 'items-start' : 'items-end'} max-w-2xl`}>
            <div className={`rounded-lg py-2 px-4 ${isAI
                ? 'bg-white border border-gray-200'
                : 'bg-blue-600 text-white'}`}>
              <ReactMarkdown className="prose">
                {message.payload.content}
              </ReactMarkdown>
            </div>
            <span className="text-xs text-gray-500 mt-1">
              {formatDistanceToNow(new Date(message.created_at), {
                addSuffix: true
            })}
            </span>
          </div>
          {!isAI && (<Avatar className="h-8 w-8" src="/user-avatar.png" alt="User"/>)}
        </>)}
    </div>);
}
export function MessageList() {
    const { state } = useChat();
    const { messages, isLoading } = state;
    const bottomRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    if (messages.length === 0) {
        return (<div className="flex items-center justify-center h-full text-gray-500">
        No messages yet
      </div>);
    }
    return (<div className="space-y-4 px-4">
      {messages.map((message) => (<MessageItem key={message.id} message={message}/>))}
      {isLoading && (<div className="flex justify-center">
          <div className="animate-pulse flex space-x-4">
            <div className="h-3 w-3 bg-gray-200 rounded-full"></div>
            <div className="h-3 w-3 bg-gray-200 rounded-full"></div>
            <div className="h-3 w-3 bg-gray-200 rounded-full"></div>
          </div>
        </div>)}
      <div ref={bottomRef}/>
    </div>);
}
