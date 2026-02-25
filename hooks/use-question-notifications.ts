"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonymousIdentity } from "@/hooks/use-anonymous-identity";
import { toast } from "sonner";

/**
 * Hook that fires a sonner toast (host-only) when a new question is submitted.
 * Seeds known question IDs on first load so initial data doesn't trigger toasts.
 * Only fires toasts when a hostToken is provided (host surfaces only).
 */
export function useQuestionNotifications(
  presentationId: string,
  hostToken: string | undefined,
) {
  const { participantId } = useAnonymousIdentity();
  const questions = useQuery(api.questions.list, {
    presentationId,
    participantId,
    hostToken,
  });
  const knownQuestionIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!questions || !hostToken) return;

    const currentIds = new Set(questions.map((q) => q._id));

    // First load: seed with existing IDs, don't fire toasts
    if (knownQuestionIdsRef.current === null) {
      knownQuestionIdsRef.current = currentIds;
      return;
    }

    // Subsequent updates: toast for genuinely new questions
    for (const question of questions) {
      if (!knownQuestionIdsRef.current.has(question._id)) {
        toast("New question", {
          id: `question-${question._id}`,
          description: question.text,
          duration: 5000,
        });
      }
    }

    knownQuestionIdsRef.current = currentIds;
  }, [questions, hostToken]);
}
