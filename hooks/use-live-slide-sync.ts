"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePresentationStore } from "@/store/use-presentation-store";

const THROTTLE_MS = 2000;

/**
 * Set to true to re-enable live canvas broadcasting to Convex.
 * Currently disabled to avoid unnecessary Convex bandwidth usage.
 */
const LIVE_SYNC_ENABLED = false;

/**
 * Presenter-side hook that broadcasts the current slide's canvas state to
 * Convex every ~2 seconds so viewers can receive near-real-time updates.
 *
 * - Reads the current slide from Zustand.
 * - Skips writes when snapshotJson hasn't changed.
 * - Calls `clear` on unmount to remove the live row from Convex.
 *
 * Must be rendered inside a <ConvexProvider>.
 */
export function useLiveSlideSync(
  presentationId: string,
  ownerToken: string,
): void {
  const upsert = useMutation(api.liveSlide.upsert);
  const clear = useMutation(api.liveSlide.clear);

  const presentation = usePresentationStore((s) =>
    s.presentations.find((p) => p.id === presentationId),
  );

  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevJsonRef = useRef<string | null>(null);
  // Keep refs to latest mutation fns and ownerToken to avoid stale closures
  const upsertRef = useRef(upsert);
  const clearRef = useRef(clear);
  const ownerTokenRef = useRef(ownerToken);

  useEffect(() => {
    upsertRef.current = upsert;
  }, [upsert]);

  useEffect(() => {
    clearRef.current = clear;
  }, [clear]);

  useEffect(() => {
    ownerTokenRef.current = ownerToken;
  }, [ownerToken]);

  // Derive the current slide data outside the throttle timer
  const currentSlide = presentation
    ? presentation.slides[presentation.currentSlideIndex]
    : null;
  const slideId = currentSlide?.id ?? null;
  const slideIndex = presentation?.currentSlideIndex ?? 0;
  const engine = presentation?.canvasEngine ?? "tldraw";

  // Compute snapshotJson from current slide
  let snapshotJson: string | null = null;
  if (currentSlide) {
    if (currentSlide.engine === "tldraw" && currentSlide.snapshot) {
      snapshotJson = JSON.stringify(currentSlide.snapshot);
    } else if (currentSlide.engine === "excalidraw") {
      snapshotJson = JSON.stringify(currentSlide.elements);
    }
  }

  // Throttled upsert: fires at most once per THROTTLE_MS when data changes
  const snapshotJsonRef = useRef(snapshotJson);
  const slideIdRef = useRef(slideId);
  const slideIndexRef = useRef(slideIndex);
  const engineRef = useRef(engine);

  useEffect(() => {
    snapshotJsonRef.current = snapshotJson;
    slideIdRef.current = slideId;
    slideIndexRef.current = slideIndex;
    engineRef.current = engine;
  });

  useEffect(() => {
    if (!LIVE_SYNC_ENABLED) return;
    if (!snapshotJson || !slideId || !ownerToken) return;
    // Skip if nothing has changed
    if (snapshotJson === prevJsonRef.current) return;

    if (throttleTimerRef.current) return; // already scheduled

    throttleTimerRef.current = setTimeout(() => {
      throttleTimerRef.current = null;

      const json = snapshotJsonRef.current;
      const sid = slideIdRef.current;
      const sidx = slideIndexRef.current;
      const eng = engineRef.current;
      const tok = ownerTokenRef.current;

      if (!json || !sid || !tok) return;
      if (json === prevJsonRef.current) return;

      prevJsonRef.current = json;

      upsertRef.current({
        presentationId,
        ownerToken: tok,
        slideId: sid,
        slideIndex: sidx,
        engine: eng,
        snapshotJson: json,
        updatedAt: Date.now(),
      }).catch((err) =>
        console.error("[useLiveSlideSync] upsert failed", err),
      );
    }, THROTTLE_MS);
  }, [snapshotJson, slideId, slideIndex, engine, ownerToken, presentationId]);

  // Clear on unmount
  useEffect(() => {
    if (!LIVE_SYNC_ENABLED) return;
    return () => {
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      const tok = ownerTokenRef.current;
      if (!tok) return;
      clearRef.current({ presentationId, ownerToken: tok }).catch(() => {
        // Best-effort cleanup — ignore errors on unmount
      });
    };
  }, [presentationId]);
}
