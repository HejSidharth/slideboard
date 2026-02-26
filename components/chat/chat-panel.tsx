"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useChat } from "@/hooks/use-chat";
import { captureElementAsPng } from "@/lib/capture-element-png";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";

interface ChatPanelProps {
  className?: string;
  onInsertAsImage?: (params: {
    dataUrl: string;
    width: number;
    height: number;
    target: "current" | "new";
    messageId: string;
  }) => Promise<void>;
}

export function ChatPanel({ className, onInsertAsImage }: ChatPanelProps) {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
  } = useChat();
  const [insertingMessageId, setInsertingMessageId] = useState<string | null>(null);

  const handleInsertAsImage = useCallback(
    async (
      message: { id: string; content: string },
      target: "current" | "new",
      sourceElement: HTMLElement | null,
    ) => {
      if (!onInsertAsImage) return;
      if (!sourceElement) {
        toast.error("Unable to capture that message right now.");
        return;
      }

      setInsertingMessageId(message.id);
      try {
        const capture = await captureElementAsPng(sourceElement);
        await onInsertAsImage({
          dataUrl: capture.dataUrl,
          width: capture.width,
          height: capture.height,
          target,
          messageId: message.id,
        });
        toast.success(
          target === "new"
            ? "Inserted assistant response on a new slide."
            : "Inserted assistant response on the current slide.",
        );
      } catch (error) {
        console.error("Failed to insert assistant image", error);
        toast.error("Could not insert this response into the slide.");
      } finally {
        setInsertingMessageId(null);
      }
    },
    [onInsertAsImage],
  );

  return (
    <aside className={className}>
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium tracking-tight">Assistant</h2>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={clearChat}
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
            Ask for explanations, examples, and classroom-ready notes.
          </p>
        </div>

        {error && (
          <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          insertingMessageId={insertingMessageId}
          onInsertAsImage={onInsertAsImage ? handleInsertAsImage : undefined}
        />

        <ChatInput onSend={sendMessage} isLoading={isLoading} />
      </div>
    </aside>
  );
}
