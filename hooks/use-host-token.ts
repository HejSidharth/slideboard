"use client";

import { useEffect, useMemo } from "react";
import { useMutation } from "convex/react";
import { nanoid } from "nanoid";
import { api } from "@/convex/_generated/api";

const STORAGE_KEY_PREFIX = "slideboard-host-token:";

/**
 * Returns a stable host token for this presentation, persisted in localStorage.
 * On first call for a given presentationId, registers the token with Convex so
 * that host-only mutations (markAnswered, setHidden, remove) are gated behind it.
 *
 * Only import this hook in host surfaces (editor page, present mode).
 * Students on the join page never call this hook, so they never obtain a token.
 */
export function useHostToken(presentationId: string): string {
  const token = useMemo<string>(() => {
    if (typeof window === "undefined") return "";
    const key = `${STORAGE_KEY_PREFIX}${presentationId}`;
    const stored = localStorage.getItem(key);
    if (stored) return stored;
    const fresh = nanoid(32);
    localStorage.setItem(key, fresh);
    return fresh;
  }, [presentationId]);

  const registerHost = useMutation(api.questions.registerHost);

  useEffect(() => {
    if (!token || !presentationId) return;
    registerHost({ presentationId, token }).catch(() => {
      // Silent — if offline, token will be registered on next successful call
    });
  }, [token, presentationId, registerHost]);

  return token;
}
