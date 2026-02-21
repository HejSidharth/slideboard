"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageCircle, Settings, Trash2 } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { ApiKeyDialog } from "./api-key-dialog";

export function ChatSheet() {
  const [isOpen, setIsOpen] = useState(false);
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

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    // If opening and no API key, show the dialog
    if (open && !hasApiKey) {
      setShowApiKeyDialog(true);
    }
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="h-10 px-4"
              onClick={() => setIsOpen(true)}
            >
              Assistant
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">SlideBoard Assistant</TooltipContent>
        </Tooltip>
      </div>

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent className="flex w-[420px] flex-col p-0 sm:w-[480px]">
          <SheetHeader className="shrink-0 border-b border-border p-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                SlideBoard Assistant
              </SheetTitle>
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
                  <TooltipContent>
                    {hasApiKey ? "Change API Key" : "Set API Key"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </SheetHeader>

          {/* Error banner */}
          {error && (
            <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* API Key prompt */}
          {!hasApiKey && (
            <div className="border-b border-border bg-secondary p-4">
              <p className="text-sm text-muted-foreground mb-2">
                Add an OpenRouter API key to enable SlideBoard Assistant.
              </p>
              <Button
                size="sm"
                onClick={() => setShowApiKeyDialog(true)}
              >
                Add API Key
              </Button>
            </div>
          )}

          {/* Messages area */}
          <ChatMessages messages={messages} isLoading={isLoading} />

          {/* Input area */}
          <ChatInput
            onSend={sendMessage}
            isLoading={isLoading}
            disabled={!hasApiKey}
          />
        </SheetContent>
      </Sheet>

      <ApiKeyDialog
        open={showApiKeyDialog}
        onOpenChange={setShowApiKeyDialog}
        onSave={setApiKey}
      />
    </>
  );
}
