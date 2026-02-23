"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const MAX_TIMER_SECONDS = 60 * 60;

interface TimerState {
  durationSec: number;
  remainingMs: number;
  isRunning: boolean;
  endAt: number | null;
}

const DEFAULT_DURATION_SEC = 3 * 60;

function clampSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) return DEFAULT_DURATION_SEC;
  return Math.min(Math.max(Math.floor(seconds), 1), MAX_TIMER_SECONDS);
}

function getInitialState(storageKey: string): TimerState {
  if (typeof window === "undefined") {
    return {
      durationSec: DEFAULT_DURATION_SEC,
      remainingMs: DEFAULT_DURATION_SEC * 1000,
      isRunning: false,
      endAt: null,
    };
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return {
        durationSec: DEFAULT_DURATION_SEC,
        remainingMs: DEFAULT_DURATION_SEC * 1000,
        isRunning: false,
        endAt: null,
      };
    }

    const parsed = JSON.parse(raw) as Partial<TimerState>;
    const durationSec = clampSeconds(parsed.durationSec ?? DEFAULT_DURATION_SEC);

    if (parsed.isRunning && typeof parsed.endAt === "number") {
      const nextRemaining = Math.max(0, parsed.endAt - Date.now());
      return {
        durationSec,
        remainingMs: nextRemaining,
        isRunning: nextRemaining > 0,
        endAt: nextRemaining > 0 ? parsed.endAt : null,
      };
    }

    const fallbackRemaining =
      typeof parsed.remainingMs === "number"
        ? Math.max(0, parsed.remainingMs)
        : durationSec * 1000;

    return {
      durationSec,
      remainingMs: fallbackRemaining,
      isRunning: false,
      endAt: null,
    };
  } catch {
    return {
      durationSec: DEFAULT_DURATION_SEC,
      remainingMs: DEFAULT_DURATION_SEC * 1000,
      isRunning: false,
      endAt: null,
    };
  }
}

export function formatRemainingMs(remainingMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSec / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSec % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function usePresentationTimer(presentationId: string) {
  const storageKey = useMemo(() => `slideboard-timer:${presentationId}`, [presentationId]);
  const [timerState, setTimerState] = useState<TimerState>(() => getInitialState(storageKey));

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(timerState));
  }, [storageKey, timerState]);

  useEffect(() => {
    if (!timerState.isRunning || timerState.endAt === null) return;

    const intervalId = window.setInterval(() => {
      setTimerState((prev) => {
        if (!prev.isRunning || prev.endAt === null) return prev;

        const nextRemaining = Math.max(0, prev.endAt - Date.now());
        if (nextRemaining <= 0) {
          return {
            ...prev,
            remainingMs: 0,
            isRunning: false,
            endAt: null,
          };
        }

        if (Math.abs(nextRemaining - prev.remainingMs) < 80) {
          return prev;
        }

        return {
          ...prev,
          remainingMs: nextRemaining,
        };
      });
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [timerState.endAt, timerState.isRunning]);

  const start = useCallback((seconds?: number) => {
    setTimerState((prev) => {
      const durationSec = clampSeconds(seconds ?? prev.durationSec);
      const remainingMs = durationSec * 1000;
      return {
        durationSec,
        remainingMs,
        isRunning: true,
        endAt: Date.now() + remainingMs,
      };
    });
  }, []);

  const pause = useCallback(() => {
    setTimerState((prev) => {
      if (!prev.isRunning || prev.endAt === null) return prev;

      const nextRemaining = Math.max(0, prev.endAt - Date.now());
      return {
        ...prev,
        remainingMs: nextRemaining,
        isRunning: false,
        endAt: null,
      };
    });
  }, []);

  const resume = useCallback(() => {
    setTimerState((prev) => {
      if (prev.isRunning || prev.remainingMs <= 0) return prev;

      return {
        ...prev,
        isRunning: true,
        endAt: Date.now() + prev.remainingMs,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setTimerState((prev) => ({
      ...prev,
      remainingMs: prev.durationSec * 1000,
      isRunning: false,
      endAt: null,
    }));
  }, []);

  const setDuration = useCallback((seconds: number) => {
    setTimerState((prev) => {
      const durationSec = clampSeconds(seconds);
      const remainingMs = durationSec * 1000;

      if (prev.isRunning) {
        return {
          durationSec,
          remainingMs,
          isRunning: true,
          endAt: Date.now() + remainingMs,
        };
      }

      return {
        ...prev,
        durationSec,
        remainingMs,
        endAt: null,
      };
    });
  }, []);

  return {
    durationSec: timerState.durationSec,
    remainingMs: timerState.remainingMs,
    isRunning: timerState.isRunning,
    isFinished: timerState.remainingMs <= 0,
    formattedTime: formatRemainingMs(timerState.remainingMs),
    maxDurationSec: MAX_TIMER_SECONDS,
    start,
    pause,
    resume,
    reset,
    setDuration,
  };
}
