"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

/**
 * Hook that fires a sonner toast when a new chat message arrives.
 * Seeds known message IDs on first load so initial data doesn't trigger toasts.
 * Skips messages from the current participant (don't notify yourself).
 * Only fires when `enabled` is true.
 */
export function useChatNotifications(
  presentationId: string,
  participantId: string,
  enabled: boolean
) {
  const messages = useQuery(api.messages.list, { presentationId, participantId });
  const knownMessageIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!messages) return;

    const currentIds = new Set(messages.map((m) => m._id));

    // First load: seed with existing message IDs, don't fire toasts
    if (knownMessageIdsRef.current === null) {
      knownMessageIdsRef.current = currentIds;
      return;
    }

    // Only fire toasts when enabled
    if (enabled) {
      for (const msg of messages) {
        if (
          !knownMessageIdsRef.current.has(msg._id) &&
          msg.participantId !== participantId
        ) {
          toast(msg.displayName, {
            id: `msg-${msg._id}`,
            description:
              msg.content.length > 80
                ? msg.content.slice(0, 80) + "..."
                : msg.content,
            duration: 4000,
          });
        }
      }
    }

    knownMessageIdsRef.current = currentIds;
  }, [messages, enabled, participantId]);
}
