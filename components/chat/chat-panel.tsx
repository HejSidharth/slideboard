"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Settings, Trash2 } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { ApiKeyDialog } from "./api-key-dialog";

interface ChatPanelProps {
  className?: string;
}

export function ChatPanel({ className }: ChatPanelProps) {
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);

  const {
    messages,
    isLoading,
    error,
    hasApiKey,
    sendMessage,
    clearChat,
    setApiKey,
  } = useChat();

  const quickPrompts = useMemo(
    () => [
      "Summarize this slide",
      "Generate a 3-question quiz",
      "Write speaker notes",
    ],
    [],
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowApiKeyDialog(true)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{hasApiKey ? "Change API Key" : "Set API Key"}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            Ask for outlines, explanations, and speaker notes.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[11px]"
                disabled={!hasApiKey || isLoading}
                onClick={() => sendMessage(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>

        {error && (
          <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {!hasApiKey && (
          <div className="border-b border-border bg-secondary p-4">
            <p className="mb-2 text-xs text-muted-foreground">
              Add an OpenRouter API key to enable assistant.
            </p>
            <Button size="sm" className="h-8 text-xs" onClick={() => setShowApiKeyDialog(true)}>
              Add API Key
            </Button>
          </div>
        )}

        <ChatMessages messages={messages} isLoading={isLoading} />

        <ChatInput onSend={sendMessage} isLoading={isLoading} disabled={!hasApiKey} />
      </div>

      <ApiKeyDialog
        open={showApiKeyDialog}
        onOpenChange={setShowApiKeyDialog}
        onSave={setApiKey}
      />
    </aside>
  );
}
