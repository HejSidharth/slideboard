"use client";

import { useState, useCallback } from "react";
import { nanoid } from "nanoid";
import {
  sendChatMessage,
  type ChatMessage as OpenRouterMessage,
} from "@/lib/openrouter";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export type ChatMode = "general" | "question" | "example";

const MODE_PROMPTS: Record<Exclude<ChatMode, "general">, string> = {
  question:
    "You are in Question-only mode. Return only the question content requested by the user. Never include answer keys, correct choices, hints, explanations, rationale, or commentary. Never include lines such as 'Answer:', 'Correct answer:', or 'Explanation:'. If the request is English grammar/writing/reading, follow SAT-style formatting exactly: 'Passage' on its own line, then the passage text, then one multiple-choice question with exactly four options labeled 'a)', 'b)', 'c)', and 'd)'. Output only the question block itself. If math is needed, use strict LaTeX delimiters only: inline `$...$` and display `$$...$$`.",
  example:
    "You are in Example-only mode. Return only the example requested by the user. Do not include explanations, headings, labels, or commentary. Do not prefix with phrases like 'Example:' or 'Here is an example'. If math is needed, use strict LaTeX delimiters only: inline `$...$` and display `$$...$$`. Output only the final example content.",
};

function sanitizeQuestionModeOutput(content: string): string {
  const lines = content.split("\n");
  const stopLineRegex =
    /^\s*(?:\*\*\s*)?(?:answer|correct\s*answer|explanation|rationale|why\s+this\s+is\s+correct)\b/i;

  const keptLines: string[] = [];
  for (const line of lines) {
    if (stopLineRegex.test(line)) {
      break;
    }
    keptLines.push(line);
  }

  return keptLines.join("\n").trim();
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>("");

  const sendMessage = useCallback(
    async (content: string, mode: ChatMode = "general") => {
      if (!content.trim()) return;

      const userMessage: ChatMessage = {
        id: nanoid(),
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);
      setStreamingContent("");

      // Create assistant message placeholder
      const assistantMessageId = nanoid();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      try {
        // Build message history for the API
        const messageHistory: OpenRouterMessage[] = [
          {
            role: "system",
            content:
              "You are SlideBoard Assistant for educators. Keep answers concise, practical, and classroom-friendly. Format every response in clean Markdown with short sections and bullet points when useful. For math, use strict LaTeX delimiters only: inline `$...$` and display `$$...$$`. Do not use `\\(...\\)` or `\\[...\\]`. Keep display equations readable in narrow chat panels by avoiding very long single-line formulas when possible; prefer multiline steps or split expressions. Use fenced code blocks with language tags for executable code examples.",
          },
          ...(mode === "general"
            ? []
            : ([
                {
                  role: "system",
                  content: MODE_PROMPTS[mode],
                },
              ] as const)),
          ...messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user" as const, content: content.trim() },
        ];

        let fullResponse = "";

        await sendChatMessage(messageHistory, (chunk) => {
          fullResponse += chunk;
          const visibleContent =
            mode === "question"
              ? sanitizeQuestionModeOutput(fullResponse)
              : fullResponse;
          setStreamingContent(fullResponse);
          // Update the assistant message in real-time
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: visibleContent }
                : m
            )
          );
        });

        const finalContent =
          mode === "question"
            ? sanitizeQuestionModeOutput(fullResponse)
            : fullResponse;

        // Final update to ensure the message is complete
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: finalContent, timestamp: Date.now() }
              : m
          )
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        setError(errorMessage);
        // Remove the empty assistant message on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
      } finally {
        setIsLoading(false);
        setStreamingContent("");
      }
    },
    [messages]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    streamingContent,
    sendMessage,
    clearChat,
  };
}
