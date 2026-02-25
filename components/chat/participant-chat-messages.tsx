"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { MessageCircle } from "lucide-react";

interface ParticipantMessage {
  _id: string;
  participantId: string;
  displayName: string;
  color: string;
  content: string;
  createdAt: number;
}

interface ParticipantChatMessagesProps {
  messages: ParticipantMessage[];
  currentParticipantId: string;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ParticipantChatMessages({
  messages,
  currentParticipantId,
}: ParticipantChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No messages yet.</p>
          <p className="text-xs mt-1 opacity-70">
            Send a message to start the conversation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-3">
        {messages.map((message) => {
          const isOwn = message.participantId === currentParticipantId;

          return (
            <div
              key={message._id}
              className={cn(
                "flex gap-2",
                isOwn ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* Avatar dot */}
              <div
                className="mt-1 h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: message.color }}
              >
                {message.displayName.charAt(0).toUpperCase()}
              </div>

              {/* Message bubble */}
              <div
                className={cn(
                  "max-w-[80%]",
                  isOwn ? "text-right" : "text-left"
                )}
              >
                <div
                  className={cn(
                    "flex items-baseline gap-2 mb-0.5",
                    isOwn ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <span
                    className="text-xs font-medium"
                    style={{ color: message.color }}
                  >
                    {isOwn ? "You" : message.displayName}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
                <div
                  className={cn(
                    "inline-block border px-3 py-1.5 text-sm break-words rounded-lg",
                    isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.content}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
