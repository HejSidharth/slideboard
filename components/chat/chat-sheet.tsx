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
import { MessageCircle, Settings, Trash2, X } from "lucide-react";
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
    removeApiKey,
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
      {/* Floating trigger button */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full shadow-lg bg-background border-2"
              onClick={() => setIsOpen(true)}
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">AI Assistant</TooltipContent>
        </Tooltip>
      </div>

      {/* Chat Sheet */}
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent className="w-[400px] sm:w-[450px] p-0 flex flex-col">
          <SheetHeader className="p-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                AI Assistant
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
            <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* API Key prompt */}
          {!hasApiKey && (
            <div className="p-4 bg-muted/50 border-b">
              <p className="text-sm text-muted-foreground mb-2">
                Set up your API key to start chatting with the AI assistant.
              </p>
              <Button
                size="sm"
                onClick={() => setShowApiKeyDialog(true)}
              >
                Set API Key
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

      {/* API Key Dialog */}
      <ApiKeyDialog
        open={showApiKeyDialog}
        onOpenChange={setShowApiKeyDialog}
        onSave={setApiKey}
      />
    </>
  );
}
