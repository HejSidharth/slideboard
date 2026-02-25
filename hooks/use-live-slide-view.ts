"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Set to true alongside LIVE_SYNC_ENABLED in use-live-slide-sync.ts to
 * re-enable live canvas viewing. When false, useQuery is skipped so no
 * Convex bandwidth is consumed by viewers.
 */
const LIVE_VIEW_ENABLED = false;

export interface LiveSlideViewResult {
  /** The live slide ID being broadcast by the presenter, or null if none */
  liveSlideId: string | null;
  /** The live slide index (0-based), or null */
  liveSlideIndex: number | null;
  /** The canvas engine used by the presenter */
  liveEngine: "tldraw" | "excalidraw" | null;
  /** JSON-serialized snapshot (tldraw: StoreSnapshot, excalidraw: elements array) */
  liveSnapshotJson: string | null;
  /** True when the presenter is actively broadcasting */
  isLive: boolean;
}

/**
 * Viewer-side hook that subscribes to the presenter's live canvas state.
 *
 * Convex pushes updates reactively whenever the presenter upserts the row,
 * so viewers receive near-real-time canvas changes with ~2 s latency.
 *
 * Must be rendered inside a <ConvexProvider>.
 */
export function useLiveSlideView(
  presentationId: string,
): LiveSlideViewResult {
  const row = useQuery(
    api.liveSlide.get,
    LIVE_VIEW_ENABLED ? { presentationId } : "skip",
  );

  if (!row) {
    return {
      liveSlideId: null,
      liveSlideIndex: null,
      liveEngine: null,
      liveSnapshotJson: null,
      isLive: false,
    };
  }

  return {
    liveSlideId: row.slideId,
    liveSlideIndex: row.slideIndex,
    liveEngine: row.engine,
    liveSnapshotJson: row.snapshotJson,
    isLive: true,
  };
}
