"use client";

import { useMemo } from "react";
import { nanoid } from "nanoid";

const STORAGE_KEY_PREFIX = "slideboard-owner-token:";

/**
 * Returns a stable owner token for a presentation, persisted in localStorage.
 *
 * The token is a 32-char nanoid generated once and stored locally. It is
 * passed to Convex mutations that write canvas data so the server can verify
 * ownership (via the stored SHA-256 hash) before accepting writes.
 *
 * Anyone who has the presentationId can READ the board. Only the browser
 * holding the matching token can WRITE or DELETE it.
 *
 * Returns an empty string during SSR.
 */
export function useOwnerToken(presentationId: string): string {
  return useMemo<string>(() => {
    if (typeof window === "undefined") return "";
    return getOrCreateOwnerToken(presentationId);
  }, [presentationId]);
}

/**
 * Returns (or creates) the owner token for a given presentationId.
 * Safe to call outside of a React component (e.g. from sync utilities).
 */
export function getOrCreateOwnerToken(presentationId: string): string {
  if (typeof window === "undefined") return "";
  const key = `${STORAGE_KEY_PREFIX}${presentationId}`;
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  const fresh = nanoid(32);
  localStorage.setItem(key, fresh);
  return fresh;
}

/**
 * Returns the stored owner token for a given presentationId, or null if this
 * browser has never been the owner of that presentation.
 */
export function getOwnerToken(presentationId: string): string | null {
  if (typeof window === "undefined") return null;
  const key = `${STORAGE_KEY_PREFIX}${presentationId}`;
  return localStorage.getItem(key);
}
