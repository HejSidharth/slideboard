"use client";

import { useState, useCallback } from "react";
import {
  loadIdentity,
  saveIdentity,
} from "@/lib/identity";
import type { AnonymousIdentity } from "@/lib/identity";

export function useAnonymousIdentity() {
  const [identity, setIdentity] = useState<AnonymousIdentity>(loadIdentity);

  const setDisplayName = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setIdentity((prev) => {
      const next = { ...prev, displayName: trimmed };
      saveIdentity(next);
      return next;
    });
  }, []);

  return {
    participantId: identity.participantId,
    displayName: identity.displayName,
    color: identity.color,
    setDisplayName,
  };
}
