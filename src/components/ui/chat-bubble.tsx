import * as React from "react";
import { cn } from "@/lib/utils";
import { Message, MessageReactionCount } from "@/types/chat";
import { MessageReactions } from "../chat/MessageReactions";
import { formatDate } from "@/utils/format";

export interface ChatBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  message: Message;
  isOwn?: boolean;
  onReact?: (emoji: string) => void;
  onRemoveReaction?: (emoji: string) => void;
}

export const ChatBubble = React.forwardRef<HTMLDivElement, ChatBubbleProps>(
  ({ className, message, isOwn, onReact, onRemoveReaction, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          isOwn ? "justify-end" : "justify-start",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "max-w-[70%] rounded-lg px-4 py-2",
            isOwn
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {/* Message Content */}
          <div className="break-words">{message.content}</div>

          {/* Metadata */}
          <div className="mt-1 flex items-center justify-between gap-2 text-xs opacity-70">
            <span>{formatDate(message.timestamp)}</span>
            {message.status && (
              <span className="capitalize">{message.status}</span>
            )}
          </div>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-2 rounded bg-background/50 p-2 text-sm"
                >
                  <span className="truncate">{attachment.name}</span>
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && onReact && onRemoveReaction && (
            <div className="mt-2">
              <MessageReactions
                reactions={message.reactions}
                onReact={onReact}
                onRemoveReaction={onRemoveReaction}
              />
            </div>
          )}
        </div>
      </div>
    );
  }
);

ChatBubble.displayName = "ChatBubble"; 