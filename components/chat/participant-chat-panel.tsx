"use client";

import { useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { nanoid } from "nanoid";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash2 } from "lucide-react";
import { useAnonymousIdentity } from "@/hooks/use-anonymous-identity";
import { ParticipantChatMessages } from "./participant-chat-messages";
import { ChatInput } from "./chat-input";

interface ParticipantChatPanelProps {
  presentationId: string;
  className?: string;
}

export function ParticipantChatPanel({
  presentationId,
  className,
}: ParticipantChatPanelProps) {
  const { participantId, displayName, color } = useAnonymousIdentity();
  const messages = useQuery(api.messages.list, { presentationId, participantId });
  const sendMessage = useMutation(api.messages.send);
  const clearMessages = useMutation(api.messages.clear);
  const toggleLike = useMutation(api.messages.toggleLike);

  const handleSend = useCallback(
    (content: string) => {
      sendMessage({
        presentationId,
        participantId,
        displayName,
        color,
        content,
        clientMessageId: nanoid(),
      });
    },
    [sendMessage, presentationId, participantId, displayName, color]
  );

  const handleToggleLike = useCallback(
    (messageId: string) => {
      toggleLike({ messageId: messageId as any, participantId });
    },
    [toggleLike, participantId]
  );

  const handleClear = useCallback(() => {
    clearMessages({ presentationId });
  }, [clearMessages, presentationId]);

  return (
    <aside className={className}>
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium tracking-tight">Chat</h2>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-xs">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="max-w-[80px] truncate">{displayName}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your anonymous identity</p>
                </TooltipContent>
              </Tooltip>

              {(messages?.length ?? 0) > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleClear}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear chat</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            Real-time anonymous chat for this presentation.
          </p>
        </div>

        <ParticipantChatMessages
          messages={messages ?? []}
          currentParticipantId={participantId}
          onToggleLike={handleToggleLike}
        />

        <ChatInput
          onSend={handleSend}
          isLoading={false}
          placeholder="Type a message..."
        />
      </div>
    </aside>
  );
}
