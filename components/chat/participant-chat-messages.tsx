"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { MessageCircle, Heart } from "lucide-react";

interface ParticipantMessage {
  _id: string;
  participantId: string;
  displayName: string;
  color: string;
  content: string;
  createdAt: number;
  likeCount: number;
  liked: boolean;
}

interface ParticipantChatMessagesProps {
  messages: ParticipantMessage[];
  currentParticipantId: string;
  onToggleLike: (messageId: string) => void;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Returns whether a message is the first in a consecutive group
 * from the same sender (within 2 minutes).
 */
function isGroupStart(
  messages: ParticipantMessage[],
  index: number
): boolean {
  if (index === 0) return true;
  const prev = messages[index - 1];
  const curr = messages[index];
  if (prev.participantId !== curr.participantId) return true;
  // Break group after 2 minutes gap
  if (curr.createdAt - prev.createdAt > 2 * 60 * 1000) return true;
  return false;
}

export function ParticipantChatMessages({
  messages,
  currentParticipantId,
  onToggleLike,
}: ParticipantChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [animatingLike, setAnimatingLike] = useState<string | null>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  const handleDoubleTap = useCallback(
    (messageId: string) => {
      onToggleLike(messageId);
      setAnimatingLike(messageId);
      setTimeout(() => setAnimatingLike(null), 600);
    },
    [onToggleLike]
  );

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
    <div className="flex-1 overflow-y-auto px-3 py-2">
      <div className="space-y-0.5">
        {messages.map((message, index) => {
          const isOwn = message.participantId === currentParticipantId;
          const groupStart = isGroupStart(messages, index);

          return (
            <div
              key={message._id}
              className={cn(
                "flex gap-1.5",
                isOwn ? "flex-row-reverse" : "flex-row",
                groupStart ? "mt-2 first:mt-0" : "mt-0"
              )}
            >
              {/* Avatar — shown only at group start, otherwise spacer */}
              {groupStart ? (
                <div
                  className="mt-0.5 h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ backgroundColor: message.color }}
                >
                  {message.displayName.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-5 shrink-0" />
              )}

              {/* Message column */}
              <div
                className={cn(
                  "group relative max-w-[80%]",
                  isOwn ? "text-right" : "text-left"
                )}
              >
                {/* Name + time — only at group start */}
                {groupStart && (
                  <div
                    className={cn(
                      "flex items-baseline gap-1.5 mb-0.5",
                      isOwn ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <span
                      className="text-[11px] font-medium leading-none"
                      style={{ color: message.color }}
                    >
                      {isOwn ? "You" : message.displayName}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-none">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                )}

                {/* Bubble + floating heart */}
                <div className="relative inline-block">
                  <div
                    className={cn(
                      "inline-block border px-2.5 py-1 text-sm break-words rounded-lg select-none",
                      isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                    onDoubleClick={() => handleDoubleTap(message._id)}
                  >
                    {message.content}
                  </div>

                  {/* Double-tap heart animation */}
                  {animatingLike === message._id && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <Heart className="h-6 w-6 fill-rose-500 text-rose-500 animate-like-pop" />
                    </div>
                  )}

                  {/* Floating heart badge — bottom corner of bubble */}
                  {message.likeCount > 0 && (
                    <button
                      type="button"
                      className={cn(
                        "absolute -bottom-2 flex items-center gap-0.5 rounded-full border bg-background px-1 py-0.5 text-[10px] leading-none shadow-sm transition-colors",
                        isOwn ? "left-0" : "right-0",
                        message.liked
                          ? "border-rose-200 text-rose-500"
                          : "border-border text-muted-foreground hover:text-rose-400"
                      )}
                      onClick={() => onToggleLike(message._id)}
                    >
                      <Heart
                        className={cn(
                          "h-2.5 w-2.5",
                          message.liked && "fill-current"
                        )}
                      />
                      <span>{message.likeCount}</span>
                    </button>
                  )}

                  {/* Hover-reveal like button (desktop) — only when no badge */}
                  {message.likeCount === 0 && (
                    <button
                      type="button"
                      className={cn(
                        "absolute -bottom-2 hidden items-center rounded-full border border-border bg-background p-0.5 shadow-sm transition-colors group-hover:flex",
                        isOwn ? "left-0" : "right-0",
                        message.liked
                          ? "text-rose-500"
                          : "text-muted-foreground hover:text-rose-400"
                      )}
                      onClick={() => onToggleLike(message._id)}
                    >
                      <Heart
                        className={cn(
                          "h-2.5 w-2.5",
                          message.liked && "fill-current"
                        )}
                      />
                    </button>
                  )}
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
