import React from 'react';
import { useChat } from "@/../contexts/ChatContext";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ChatHeader } from "./ChatHeader";
export function ChatContainer() {
    const { state } = useChat();
    const { currentSession, isLoading, error } = state;
    if (!currentSession) {
        return (<div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Select or create a chat session to begin</p>
      </div>);
    }
    return (<div className="flex flex-col h-full">
      <ChatHeader session={currentSession}/>
      
      <div className="flex-1 overflow-hidden relative">
        {error && (<div className="absolute top-0 left-0 right-0 bg-red-100 text-red-700 px-4 py-2">
            {error}
          </div>)}
        
        <div className="h-full overflow-y-auto pb-4">
          <MessageList />
        </div>
      </div>

      <div className="border-t border-gray-200 p-4">
        <MessageInput disabled={isLoading}/>
      </div>
    </div>);
}
