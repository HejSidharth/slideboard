"use client";

import { useState, useCallback, useEffect } from "react";
import { nanoid } from "nanoid";
import {
  sendChatMessage,
  getStoredApiKey,
  setStoredApiKey,
  clearStoredApiKey,
  type ChatMessage as OpenRouterMessage,
} from "@/lib/openrouter";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>("");

  // Load API key from localStorage on mount
  useEffect(() => {
    const storedKey = getStoredApiKey();
    if (storedKey) {
      setApiKeyState(storedKey);
    }
  }, []);

  const setApiKey = useCallback((key: string) => {
    setStoredApiKey(key);
    setApiKeyState(key);
    setError(null);
  }, []);

  const removeApiKey = useCallback(() => {
    clearStoredApiKey();
    setApiKeyState(null);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!apiKey) {
        setError("Please set your OpenRouter API key first.");
        return;
      }

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
              "You are a helpful AI assistant for SlideBoard, a whiteboard presentation app for tutoring. Keep your answers concise and helpful. If asked about math, science, or educational topics, provide clear explanations.",
          },
          ...messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user" as const, content: content.trim() },
        ];

        let fullResponse = "";

        await sendChatMessage(messageHistory, apiKey, (chunk) => {
          fullResponse += chunk;
          setStreamingContent(fullResponse);
          // Update the assistant message in real-time
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: fullResponse }
                : m
            )
          );
        });

        // Final update to ensure the message is complete
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: fullResponse, timestamp: Date.now() }
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
    [apiKey, messages]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    apiKey,
    streamingContent,
    sendMessage,
    clearChat,
    setApiKey,
    removeApiKey,
    hasApiKey: !!apiKey,
  };
}
