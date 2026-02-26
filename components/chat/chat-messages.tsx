"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImagePlus, Loader2, MoreHorizontal, PlusSquare, User } from "lucide-react";
import type { ChatMessage } from "@/hooks/use-chat";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  insertingMessageId?: string | null;
  onInsertAsImage?: (
    message: ChatMessage,
    target: "current" | "new",
    sourceElement: HTMLElement | null,
  ) => void;
}

export function ChatMessages({
  messages,
  isLoading,
  insertingMessageId = null,
  onInsertAsImage,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const bubbleRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pendingAssistantMessage =
    isLoading &&
    messages[messages.length - 1]?.role === "assistant" &&
    messages[messages.length - 1]?.content.trim() === "";

  const visibleMessages = messages.filter(
    (message) =>
      !(isLoading && message.role === "assistant" && message.content.trim() === ""),
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [visibleMessages.length, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          <div className="relative mx-auto mb-3 h-12 w-12 overflow-hidden rounded-full border border-border">
            <Image
              src="/chatbot-avatar.png"
              alt="SlideBoard Assistant avatar"
              fill
              className="object-cover"
            />
          </div>
          <p className="text-sm">Ask anything about your lesson.</p>
          <p className="text-xs mt-1 opacity-70">
            I can help explain concepts, outline slides, and prep talking points.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-4">
        {visibleMessages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "group/message flex gap-2.5",
              message.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted overflow-hidden"
              )}
            >
              {message.role === "user" ? (
                <User className="h-4 w-4" />
              ) : (
                <Image
                  src="/chatbot-avatar.png"
                  alt="SlideBoard Assistant avatar"
                  width={28}
                  height={28}
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            {/* Message bubble */}
            <div
              ref={(element) => {
                bubbleRefs.current[message.id] = element;
              }}
              className={cn(
                "relative w-fit max-w-[85%] min-w-0 overflow-x-auto rounded-2xl px-3 py-2 text-sm",
                message.role === "user"
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md border border-border bg-muted/60",
                message.role === "assistant" && onInsertAsImage && "pr-8",
              )}
            >
              {message.role === "assistant" && onInsertAsImage && (
                <div className="chat-message-actions absolute right-1 top-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-background/70 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover/message:opacity-100"
                        aria-label="Message actions"
                        disabled={Boolean(insertingMessageId)}
                      >
                        {insertingMessageId === message.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem
                        onSelect={() =>
                          onInsertAsImage(
                            message,
                            "current",
                            bubbleRefs.current[message.id] ?? null,
                          )
                        }
                        disabled={Boolean(insertingMessageId)}
                      >
                        <ImagePlus className="h-4 w-4" />
                        Insert image on current slide
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() =>
                          onInsertAsImage(
                            message,
                            "new",
                            bubbleRefs.current[message.id] ?? null,
                          )
                        }
                        disabled={Boolean(insertingMessageId)}
                      >
                        <PlusSquare className="h-4 w-4" />
                        Insert image on new slide
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              <div className="chat-markdown prose prose-sm dark:prose-invert max-w-none break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    // Custom components for better styling in chat bubbles
                    p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 last:mb-0">{children}</ol>,
                    li: ({ children }) => <li className="mb-0.5">{children}</li>,
                    h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-primary/50 pl-2 italic mb-2">{children}</blockquote>
                    ),
                    code: ({ className, children, ...props }) => {
                      const match = /language-(\w+)/.exec(className || "");
                      const isInline = !match && !String(children).includes("\n");
                      return isInline ? (
                        <code className="bg-background/50 rounded px-1 py-0.5 text-xs font-mono" {...props}>
                          {children}
                        </code>
                      ) : (
                        <div className="bg-background/70 border p-2 my-2 overflow-x-auto">
                          <code className="text-xs font-mono block whitespace-pre" {...props}>
                            {children}
                          </code>
                        </div>
                      );
                    },
                    pre: ({ children }) => <>{children}</>,
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                        {children}
                      </a>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-2 rounded border bg-background/50">
                        <table className="w-full text-left text-xs">{children}</table>
                      </div>
                    ),
                    th: ({ children }) => <th className="border-b border-primary/20 p-2 font-semibold">{children}</th>,
                    td: ({ children }) => <td className="border-b border-primary/10 p-2 last:border-0">{children}</td>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {pendingAssistantMessage && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
              <Image
                src="/chatbot-avatar.png"
                alt="SlideBoard Assistant avatar"
                width={28}
                height={28}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="rounded-2xl rounded-bl-md border border-border bg-muted/60 px-3 py-2">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span className="animate-pulse">Thinking</span>
                <span className="inline-flex">
                  <span className="animate-bounce [animation-delay:0ms]">.</span>
                  <span className="animate-bounce [animation-delay:150ms]">.</span>
                  <span className="animate-bounce [animation-delay:300ms]">.</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// Removed MessageContent component as we're using ReactMarkdown now
