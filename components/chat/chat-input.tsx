"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Loader2, Send } from "lucide-react";
import type { ChatMode } from "@/hooks/use-chat";

interface ChatInputProps {
  onSend: (message: string, mode: ChatMode) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const MODES: { id: ChatMode; label: string }[] = [
  { id: "general", label: "General" },
  { id: "question", label: "Question" },
  { id: "example", label: "Example" },
];

export function ChatInput({ onSend, isLoading, disabled, placeholder }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("general");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDisabled = isLoading || disabled;

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isDisabled) return;
    onSend(trimmed, mode);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  return (
    <div className="border-t border-border p-3">
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        {MODES.map((item) => {
          const isActive = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Ask SlideBoard Assistant..."}
          disabled={isDisabled}
          className="min-h-[72px] max-h-[120px] resize-none pr-12 text-sm"
          rows={1}
        />
        <Button
          size="icon-sm"
          onClick={handleSend}
          disabled={!input.trim() || isDisabled}
          className="absolute right-1.5 bottom-1.5"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="mt-1 text-right text-[10px] text-muted-foreground">
        Press Enter to send. Use Shift+Enter for a new line.
      </p>
    </div>
  );
}
