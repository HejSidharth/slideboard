"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonymousIdentity } from "@/hooks/use-anonymous-identity";
import { toast } from "sonner";

/**
 * Fires a sonner toast whenever a new activity (poll or question) becomes
 * active. Seeds known IDs on first load so existing activities don't trigger
 * toasts on page load.
 *
 * Uses the activity _id as the toast id to prevent duplicate notifications.
 */
export function useActivityNotifications(presentationId: string) {
  const { participantId } = useAnonymousIdentity();

  // Query the unified activities list (student view — no hostToken)
  const activities = useQuery(api.activities.list, {
    presentationId,
    participantId,
  });

  // Track which activity IDs we've seen. null = not yet seeded.
  const knownIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!activities) return;

    const currentIds = new Set(activities.map((a) => a._id));

    // First load: seed without firing toasts
    if (knownIdsRef.current === null) {
      knownIdsRef.current = currentIds;
      return;
    }

    // Subsequent updates: toast for genuinely new activities
    for (const activity of activities) {
      if (!knownIdsRef.current.has(activity._id)) {
        const kindLabel =
          activity.kind === "poll_mcq"
            ? "New poll"
            : activity.kind === "poll_confidence"
              ? "New confidence poll"
              : activity.kind === "question_mcq"
                ? "New question"
                : "New free-response question";

        toast(kindLabel, {
          id: `activity-${activity._id}`,
          description: activity.prompt,
          duration: 5000,
        });
      }
    }

    knownIdsRef.current = currentIds;
  }, [activities]);
}
