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

export type ChatMode =
  | "general"
  | "question"
  | "example"
  | "summarize_slide"
  | "solve_slide"
  | "clean_notes"
  | "build_handout";

interface RunAssistantRequestParams {
  label: string;
  requestMessages: OpenRouterMessage[];
  mode?: ChatMode;
}

interface RunAssistantTaskParams {
  label: string;
  run: (onChunk: (chunk: string) => void) => Promise<string>;
  mode?: ChatMode;
}

const MODE_PROMPTS: Record<Exclude<ChatMode, "general">, string> = {
  question:
    "You are in Question-only mode. Return only the question content requested by the user. Never include answer keys, correct choices, hints, explanations, rationale, or commentary. Never include lines such as 'Answer:', 'Correct answer:', or 'Explanation:'. If the request is English grammar/writing/reading, follow SAT-style formatting exactly: 'Passage' on its own line, then the passage text, then one multiple-choice question with exactly four options labeled 'a)', 'b)', 'c)', and 'd)'. Output only the question block itself. If math is needed, use strict LaTeX delimiters only: inline `$...$` and display `$$...$$`.",
  example:
    "You are in Example-only mode. Return only the example requested by the user. Do not include explanations, headings, labels, or commentary. Do not prefix with phrases like 'Example:' or 'Here is an example'. If math is needed, use strict LaTeX delimiters only: inline `$...$` and display `$$...$$`. Output only the final example content.",
  summarize_slide:
    "You are in slide-summary mode. Analyze the provided slide image and produce a concise teacher-friendly summary in Markdown. Include the main idea, key facts, and any visible tasks or prompts. If the slide appears unclear or text is hard to read, say so briefly.",
  solve_slide:
    "You are in slide-solution mode. Analyze the provided slide image and solve or explain the visible problem in a classroom-friendly way. Use Markdown with short sections. If the problem statement is partially illegible, state the uncertainty before giving the best-effort solution.",
  clean_notes:
    "You are in notes-cleanup mode. Analyze the provided slide image and rewrite the visible notes into clean, structured Markdown. Fix noisy wording, OCR-like mistakes, duplication, and weak formatting while preserving factual and mathematical correctness.",
  build_handout:
    "You are in lesson-document mode. Produce polished Markdown documents from the provided lesson material. Improve clarity, remove duplication, preserve correctness, and structure the result for teachers and students.",
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

  const createAssistantTurn = useCallback((label: string) => {
    const userMessage: ChatMessage = {
      id: nanoid(),
      role: "user",
      content: label.trim(),
      timestamp: Date.now(),
    };

    const assistantMessageId = nanoid();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);
    setError(null);
    setStreamingContent("");

    return assistantMessageId;
  }, []);

  const applyAssistantChunk = useCallback((assistantMessageId: string, content: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantMessageId
          ? { ...m, content }
          : m
      ),
    );
  }, []);

  const finalizeAssistantTurn = useCallback((assistantMessageId: string, content: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantMessageId
          ? { ...m, content, timestamp: Date.now() }
          : m
      ),
    );
    setIsLoading(false);
    setStreamingContent("");
  }, []);

  const failAssistantTurn = useCallback((assistantMessageId: string, errorMessage: string) => {
    setError(errorMessage);
    setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
    setIsLoading(false);
    setStreamingContent("");
  }, []);

  const normalizeVisibleContent = useCallback((content: string, mode: ChatMode) => {
    return mode === "question"
      ? sanitizeQuestionModeOutput(content)
      : content;
  }, []);

  const buildDefaultSystemPrompt = useCallback((mode: ChatMode): OpenRouterMessage[] => {
    const base: OpenRouterMessage[] = [
      {
        role: "system",
        content:
          "You are SlideBoard Assistant for educators. Keep answers concise, practical, and classroom-friendly. Format every response in clean Markdown with short sections and bullet points when useful. For math, use strict LaTeX delimiters only: inline `$...$` and display `$$...$$`. Do not use `\\(...\\)` or `\\[...\\]`. Keep display equations readable in narrow chat panels by avoiding very long single-line formulas when possible; prefer multiline steps or split expressions. Use fenced code blocks with language tags for executable code examples.",
      },
    ];

    if (mode !== "general") {
      base.push({
        role: "system",
        content: MODE_PROMPTS[mode],
      });
    }

    return base;
  }, []);

  const sendMessage = useCallback(
    async (content: string, mode: ChatMode = "general") => {
      if (!content.trim()) return;
      const assistantMessageId = createAssistantTurn(content.trim());

      try {
        const messageHistory: OpenRouterMessage[] = [
          ...buildDefaultSystemPrompt(mode),
          ...messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user" as const, content: content.trim() },
        ];

        let fullResponse = "";

        await sendChatMessage(messageHistory, (chunk) => {
          fullResponse += chunk;
          const visibleContent = normalizeVisibleContent(fullResponse, mode);
          setStreamingContent(fullResponse);
          applyAssistantChunk(assistantMessageId, visibleContent);
        });

        const finalContent = normalizeVisibleContent(fullResponse, mode);
        finalizeAssistantTurn(assistantMessageId, finalContent);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        failAssistantTurn(assistantMessageId, errorMessage);
      }
    },
    [
      applyAssistantChunk,
      buildDefaultSystemPrompt,
      createAssistantTurn,
      failAssistantTurn,
      finalizeAssistantTurn,
      messages,
      normalizeVisibleContent,
    ],
  );

  const runAssistantRequest = useCallback(async ({
    label,
    requestMessages,
    mode = "general",
  }: RunAssistantRequestParams) => {
    const assistantMessageId = createAssistantTurn(label);

    try {
      let fullResponse = "";
      await sendChatMessage(requestMessages, (chunk) => {
        fullResponse += chunk;
        const visibleContent = normalizeVisibleContent(fullResponse, mode);
        setStreamingContent(fullResponse);
        applyAssistantChunk(assistantMessageId, visibleContent);
      });
      finalizeAssistantTurn(
        assistantMessageId,
        normalizeVisibleContent(fullResponse, mode),
      );
      return fullResponse;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message";
      failAssistantTurn(assistantMessageId, errorMessage);
      throw err;
    }
  }, [
    applyAssistantChunk,
    createAssistantTurn,
    failAssistantTurn,
    finalizeAssistantTurn,
    normalizeVisibleContent,
  ]);

  const runAssistantTask = useCallback(async ({
    label,
    run,
    mode = "general",
  }: RunAssistantTaskParams) => {
    const assistantMessageId = createAssistantTurn(label);

    try {
      let fullResponse = "";
      const result = await run((chunk) => {
        fullResponse += chunk;
        const visibleContent = normalizeVisibleContent(fullResponse, mode);
        setStreamingContent(fullResponse);
        applyAssistantChunk(assistantMessageId, visibleContent);
      });
      const finalContent = normalizeVisibleContent(result, mode);
      finalizeAssistantTurn(assistantMessageId, finalContent);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message";
      failAssistantTurn(assistantMessageId, errorMessage);
      throw err;
    }
  }, [
    applyAssistantChunk,
    createAssistantTurn,
    failAssistantTurn,
    finalizeAssistantTurn,
    normalizeVisibleContent,
  ]);

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
    runAssistantRequest,
    runAssistantTask,
    buildDefaultSystemPrompt,
    clearChat,
  };
}
