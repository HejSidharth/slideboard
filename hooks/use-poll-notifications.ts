"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonymousIdentity } from "@/hooks/use-anonymous-identity";
import { toast } from "sonner";

/**
 * Hook that fires a sonner toast when a new poll is created.
 * Seeds known poll IDs on first load so initial data doesn't trigger toasts.
 * Uses the poll _id as the toast id to prevent duplicate notifications.
 */
export function usePollNotifications(presentationId: string) {
  const { participantId } = useAnonymousIdentity();
  const polls = useQuery(api.polls.list, { presentationId, participantId });
  const knownPollIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!polls) return;

    const currentIds = new Set(polls.map((p) => p._id));

    // First load: seed with existing poll IDs, don't fire toasts
    if (knownPollIdsRef.current === null) {
      knownPollIdsRef.current = currentIds;
      return;
    }

    // Subsequent updates: toast for genuinely new polls
    for (const poll of polls) {
      if (!knownPollIdsRef.current.has(poll._id)) {
        toast("New poll available", {
          id: `poll-${poll._id}`,
          description: poll.question,
          duration: 5000,
        });
      }
    }

    knownPollIdsRef.current = currentIds;
  }, [polls]);
}
