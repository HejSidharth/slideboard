"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useChat } from "@/hooks/use-chat";
import { captureElementAsPng } from "@/lib/capture-element-png";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";

interface ChatPanelProps {
  className?: string;
  onSummarizeSlide?: () => Promise<string>;
  onSolveSlide?: () => Promise<string>;
  onCleanSlideNotes?: () => Promise<string>;
  onGenerateLessonDocs?: (onChunk: (chunk: string) => void) => Promise<string>;
  onInsertAsMermaid?: (mermaidCode: string) => Promise<void>;
  onInsertAsImage?: (params: {
    dataUrl: string;
    width: number;
    height: number;
    target: "current" | "new";
    messageId: string;
  }) => Promise<void>;
}

export function ChatPanel({
  className,
  onSummarizeSlide,
  onSolveSlide,
  onCleanSlideNotes,
  onGenerateLessonDocs,
  onInsertAsMermaid,
  onInsertAsImage,
}: ChatPanelProps) {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    runAssistantTask,
    clearChat,
  } = useChat();
  const [insertingMessageId, setInsertingMessageId] = useState<string | null>(null);
  const [insertingMermaidMessageId, setInsertingMermaidMessageId] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<string | null>(null);

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

  const handleQuickAction = useCallback(async (
    actionId: string,
    label: string,
    mode: "summarize_slide" | "solve_slide" | "clean_notes" | "build_handout",
    run: (onChunk: (chunk: string) => void) => Promise<string>,
  ) => {
    setRunningAction(actionId);
    try {
      await runAssistantTask({
        label,
        mode,
        run,
      });
    } catch (error) {
      console.error("Assistant quick action failed", error);
    } finally {
      setRunningAction(null);
    }
  }, [runAssistantTask]);

  const handleInsertAsMermaid = useCallback(async (message: { id: string; content: string }) => {
    if (!onInsertAsMermaid) return;
    const match = message.content.match(/```mermaid\s+([\s\S]*?)```/i);
    const mermaidCode = match?.[1]?.trim();

    if (!mermaidCode) {
      toast.error("This response does not include Mermaid code.");
      return;
    }

    setInsertingMermaidMessageId(message.id);
    try {
      await onInsertAsMermaid(mermaidCode);
      toast.success("Inserted Mermaid diagram on the current slide.");
    } catch (error) {
      console.error("Failed to insert Mermaid diagram", error);
      toast.error("Could not insert this Mermaid diagram.");
    } finally {
      setInsertingMermaidMessageId(null);
    }
  }, [onInsertAsMermaid]);

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

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-start gap-1.5 text-xs"
              disabled={isLoading || !onSummarizeSlide}
              onClick={() =>
                handleQuickAction(
                  "summarize",
                  "Summarize current slide",
                  "summarize_slide",
                  () => onSummarizeSlide?.() ?? Promise.reject(new Error("Unavailable")),
                )
              }
            >
              <Sparkles className="h-3.5 w-3.5" />
              {runningAction === "summarize" ? "Working..." : "Summarize slide"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-start gap-1.5 text-xs"
              disabled={isLoading || !onSolveSlide}
              onClick={() =>
                handleQuickAction(
                  "solve",
                  "Solve current slide",
                  "solve_slide",
                  () => onSolveSlide?.() ?? Promise.reject(new Error("Unavailable")),
                )
              }
            >
              <Wand2 className="h-3.5 w-3.5" />
              {runningAction === "solve" ? "Working..." : "Solve problem"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-start gap-1.5 text-xs"
              disabled={isLoading || !onCleanSlideNotes}
              onClick={() =>
                handleQuickAction(
                  "clean",
                  "Clean notes for current slide",
                  "clean_notes",
                  () => onCleanSlideNotes?.() ?? Promise.reject(new Error("Unavailable")),
                )
              }
            >
              <FileText className="h-3.5 w-3.5" />
              {runningAction === "clean" ? "Working..." : "Clean notes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-start gap-1.5 text-xs"
              disabled={isLoading || !onGenerateLessonDocs}
              onClick={() =>
                handleQuickAction(
                  "docs",
                  "Generate lesson documents for this deck",
                  "build_handout",
                  (onChunk) => onGenerateLessonDocs?.(onChunk) ?? Promise.reject(new Error("Unavailable")),
                )
              }
            >
              <FileText className="h-3.5 w-3.5" />
              {runningAction === "docs" ? "Working..." : "Generate lesson docs"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          insertingMessageId={insertingMessageId ?? insertingMermaidMessageId}
          onInsertAsImage={onInsertAsImage ? handleInsertAsImage : undefined}
          onInsertAsMermaid={onInsertAsMermaid ? handleInsertAsMermaid : undefined}
        />

        <ChatInput onSend={sendMessage} isLoading={isLoading} />
      </div>
    </aside>
  );
}
