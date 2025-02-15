'use client';

import React, { useState, useEffect } from 'react';
import type { Attachment, Message } from 'ai';
import { useChat } from 'ai/react';
import useSWR, { useSWRConfig } from 'swr';

import { ChatHeader } from './ChatHeader';
import type { Vote } from '../types/Vote';
import { fetcher, generateUUID } from '../utils/utils';

import { Block } from './Block';
import { MultimodalInput } from './MultimodalInput';
import { Messages } from './Messages';

import type { VisibilityType } from '../types/VisibilitySelector';
import { useBlockSelector } from '../hooks/useBlock';
import { toast } from 'sonner';

interface ChatHeaderProps {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}

// Remove duplicate ChatHeader component declaration and implement it in ChatHeader.tsx

export const Chat: React.FC<{
  id: string;
  initialMessages: Array<Message>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}> = ({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
}) => {
    const { mutate } = useSWRConfig();

    const {
      messages,
      setMessages,
      handleSubmit,
      input,
      setInput,
      append,
      isLoading,
      stop,
      reload,
    } = useChat({
      id,
      body: { id, selectedChatModel },
      initialMessages,
      experimental_throttle: 100,
      sendExtraMessageFields: true,
      generateId: generateUUID,
      onFinish: () => {
        mutate('/api/history');
      },
      onError: (error) => {
        toast.error('An error occured, please try again!');
      },
    });

    const { data: votes } = useSWR<Array<Vote>>(
      `/api/vote?chatId=${id}`,
      fetcher,
    );

    const [attachments, setAttachments] = useState<Array<Attachment>>([]);
    interface BlockSelectorState {
      isVisible: boolean;
    }

    const { isVisible: isBlockVisible } = useBlockSelector();

    return (
      <>
        <div className="flex flex-col min-w-0 h-dvh bg-background">
          <ChatHeader chatId={id}
            selectedModelId={selectedChatModel}
            selectedVisibilityType={selectedVisibilityType}
            isReadonly={isReadonly} />

          <Messages
            chatId={id}
            isLoading={isLoading}
            votes={votes}
            messages={messages}
            setMessages={setMessages}
            reload={reload}
            isReadonly={isReadonly}
            isBlockVisible={isBlockVisible}
          />

          <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
            {!isReadonly && (
              <MultimodalInput
                chatId={id}
                input={input}
                setInput={setInput}
                handleSubmit={handleSubmit}
                isLoading={isLoading}
                stop={stop}
                attachments={attachments}
                setAttachments={setAttachments}
                messages={messages}
                setMessages={setMessages}
                append={append}
              />
            )}
          </form>
        </div>

        <Block
          chatId={id}
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          stop={stop}
          attachments={attachments}
          setAttachments={setAttachments}
          append={append}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          votes={votes}
          isReadonly={isReadonly}
        />
      </>
    );
  }
