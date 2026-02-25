/**
 * Background sync utility: cloud (Convex) ↔ IndexedDB ↔ Zustand.
 *
 * Responsibilities:
 *  1. pushPresentation — upload a local presentation (metadata + slides +
 *     assets) to Convex for the first time, or refresh after edits.
 *  2. pullPresentation — download a presentation from Convex into IndexedDB
 *     so it can be loaded by the editor without network access.
 *  3. hydrateStoreFromCache — populate Zustand from IndexedDB on page load
 *     (so canvas data survives localStorage being cleared / partialize).
 *
 * The sync layer is deliberately fire-and-forget where possible. Every public
 * function catches its own errors and logs them rather than throwing, so
 * callers don't need to worry about error handling.
 */

import type { ConvexReactClient } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  getSlideSnapshotsByPresentation,
  setSlideSnapshot,
  setPresentationMeta,
  getPresentationMeta,
  getSlideSnapshot,
  setCachedAssetUrl,
  type StoredSlideSnapshot,
} from "@/lib/slide-cache";
import {
  extractExcalidrawAssets,
  extractTldrawAssets,
  rehydrateExcalidrawFiles,
  rehydrateTldrawStore,
} from "@/lib/asset-extractor";
import { getOrCreateOwnerToken } from "@/hooks/use-owner-token";
import type { Presentation, SlideData, ExcalidrawSlideData, TldrawSlideData } from "@/types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getConvexUrl(): string {
  return process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
}

/**
 * Upload a binary blob to Convex File Storage via the HTTP action endpoint.
 * Returns the storageId.
 */
async function uploadBlobToConvex(
  blob: Blob,
  mimeType: string,
): Promise<string> {
  const convexUrl = getConvexUrl();
  if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL not set");

  const uploadUrl = `${convexUrl.replace(/\/$/, "")}/upload-asset`;
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "content-type": mimeType },
    body: blob,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
  const json = await res.json() as { storageId: string };
  return json.storageId;
}

// ---------------------------------------------------------------------------
// Push: local → Convex
// ---------------------------------------------------------------------------

/**
 * Sync a single slide (and its assets) from IndexedDB to Convex.
 * The ownerToken must be the one generated for this presentationId.
 */
async function syncSlideToConvex(
  convex: ConvexReactClient,
  snapshot: StoredSlideSnapshot,
  ownerToken: string,
): Promise<void> {
  const { slideId, presentationId, slideIndex, engine, sceneVersion, createdAt, updatedAt } = snapshot;

  if (engine === "excalidraw") {
    const filesJson = snapshot.filesJson;
    const files: Record<string, unknown> = filesJson ? JSON.parse(filesJson) : {};

    const { strippedFiles, assets } = await extractExcalidrawAssets(
      presentationId,
      slideId,
      files,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (blob, mimeType, _hash) => {
        return uploadBlobToConvex(blob, mimeType);
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (_contentHash) => null,
    );

    // Register all assets in Convex DB
    for (const asset of assets) {
      await convex.mutation(api.slides.saveSlideAsset, {
        presentationId,
        ownerToken,
        slideId,
        assetKey: asset.assetKey,
        storageId: asset.storageId as Id<"_storage">,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        contentHash: asset.contentHash,
      });

      // Cache the serving URL locally
      const servingUrl = `${getConvexUrl().replace(/\/$/, "")}/asset?id=${asset.storageId}`;
      await setCachedAssetUrl(asset.storageId, servingUrl);
    }

    // Update the snapshot in IDB to store the stripped version
    const strippedSnapshot: StoredSlideSnapshot = {
      ...snapshot,
      filesJson: JSON.stringify(strippedFiles),
    };
    await setSlideSnapshot(strippedSnapshot);

    await convex.mutation(api.slides.saveSlide, {
      presentationId,
      ownerToken,
      slideId,
      slideIndex,
      engine: "excalidraw",
      sceneVersion,
      elementsJson: snapshot.elementsJson ?? undefined,
      appStateJson: snapshot.appStateJson ?? undefined,
      createdAt,
      updatedAt,
    });
  } else {
    // tldraw
    const snapshotJson = snapshot.snapshotJson;
    const parsed: { store?: Record<string, unknown>; schema?: unknown } =
      snapshotJson ? JSON.parse(snapshotJson) : {};
    const store = parsed.store ?? {};

    const { strippedStore, assets } = await extractTldrawAssets(
      presentationId,
      slideId,
      store,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (blob, mimeType, _hash) => {
        return uploadBlobToConvex(blob, mimeType);
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (_contentHash) => null,
    );

    for (const asset of assets) {
      await convex.mutation(api.slides.saveSlideAsset, {
        presentationId,
        ownerToken,
        slideId,
        assetKey: asset.assetKey,
        storageId: asset.storageId as Id<"_storage">,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        contentHash: asset.contentHash,
      });
      const servingUrl = `${getConvexUrl().replace(/\/$/, "")}/asset?id=${asset.storageId}`;
      await setCachedAssetUrl(asset.storageId, servingUrl);
    }

    const strippedSnapshotJson = JSON.stringify({ ...parsed, store: strippedStore });
    const strippedSnapshot: StoredSlideSnapshot = {
      ...snapshot,
      snapshotJson: strippedSnapshotJson,
    };
    await setSlideSnapshot(strippedSnapshot);

    await convex.mutation(api.slides.saveSlide, {
      presentationId,
      ownerToken,
      slideId,
      slideIndex,
      engine: "tldraw",
      sceneVersion,
      snapshotJson: strippedSnapshotJson,
      createdAt,
      updatedAt,
    });
  }
}

/**
 * Push a full presentation (metadata + all slides) from the local device
 * to Convex. Safe to call after any mutation — it will create or update.
 *
 * This is fire-and-forget from the caller's perspective.
 */
export async function pushPresentation(
  convex: ConvexReactClient,
  presentation: Presentation,
): Promise<void> {
  if (!getConvexUrl()) return;

  const ownerToken = getOrCreateOwnerToken(presentation.id);

  try {
    // 1. Upsert presentation metadata
    await convex.mutation(api.presentations.createPresentation, {
      presentationId: presentation.id,
      name: presentation.name,
      canvasEngine: presentation.canvasEngine,
      folderId: presentation.folderId ?? undefined,
      currentSlideIndex: presentation.currentSlideIndex,
      version: presentation.version,
      ownerToken,
      createdAt: presentation.createdAt,
      updatedAt: presentation.updatedAt,
    });

    // 2. Sync each slide
    const snapshots = await getSlideSnapshotsByPresentation(presentation.id);
    const snapshotMap = new Map(snapshots.map((s) => [s.slideId, s]));

    for (let i = 0; i < presentation.slides.length; i++) {
      const slide = presentation.slides[i];
      const snapshot = snapshotMap.get(slide.id);
      if (!snapshot) continue; // slide not yet persisted to IDB — skip

      try {
        await syncSlideToConvex(convex, snapshot, ownerToken);
      } catch (err) {
        console.error(`[sync] Failed to sync slide ${slide.id}`, err);
      }
    }

    // 3. Mark meta as cloud-synced in IDB
    const meta = await getPresentationMeta(presentation.id);
    if (meta) {
      await setPresentationMeta({
        ...meta,
        cloudSynced: true,
        syncedAt: Date.now(),
      });
    }
  } catch (err) {
    console.error("[sync] pushPresentation failed", err);
  }
}

// ---------------------------------------------------------------------------
// Pull: Convex → IndexedDB (used when opening a board by ID on a new device)
// ---------------------------------------------------------------------------

/**
 * Re-hydrate a stored slide snapshot by resolving all `convexUrl:` references
 * to real serving URLs (from Convex File Storage) and caching them in IDB.
 */
async function rehydrateSnapshot(
  snapshot: StoredSlideSnapshot,
  convex: ConvexReactClient,
): Promise<StoredSlideSnapshot> {
  // Fetch asset URLs for this slide
  const assets = await convex.query(api.slides.getSlideAssets, {
    slideId: snapshot.slideId,
  });

  const resolveUrl = async (storageId: string): Promise<string | null> => {
    const asset = assets.find((a) => a.storageId === storageId);
    if (!asset?.url) return null;
    await setCachedAssetUrl(storageId, asset.url);
    return asset.url;
  };

  if (snapshot.engine === "excalidraw") {
    const files: Record<string, unknown> = snapshot.filesJson
      ? JSON.parse(snapshot.filesJson)
      : {};
    const rehydrated = await rehydrateExcalidrawFiles(files, resolveUrl);
    return { ...snapshot, filesJson: JSON.stringify(rehydrated) };
  } else {
    const parsed: { store?: Record<string, unknown> } = snapshot.snapshotJson
      ? JSON.parse(snapshot.snapshotJson)
      : {};
    const store = parsed.store ?? {};
    const rehydratedStore = await rehydrateTldrawStore(store, resolveUrl);
    return {
      ...snapshot,
      snapshotJson: JSON.stringify({ ...parsed, store: rehydratedStore }),
    };
  }
}

/**
 * Download a presentation from Convex and store it in IndexedDB.
 *
 * Returns the list of slide IDs if successful, or null on failure (e.g. the
 * presentation doesn't exist in Convex, or Convex is not configured).
 */
export async function pullPresentation(
  convex: ConvexReactClient,
  presentationId: string,
): Promise<string[] | null> {
  if (!getConvexUrl()) return null;

  try {
    const meta = await convex.query(api.presentations.getPresentation, {
      presentationId,
    });
    if (!meta) return null;

    // Persist meta to IDB
    await setPresentationMeta({
      presentationId: meta.presentationId,
      name: meta.name,
      canvasEngine: meta.canvasEngine,
      folderId: meta.folderId ?? null,
      currentSlideIndex: meta.currentSlideIndex,
      slideIds: [],
      version: meta.version,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
      syncedAt: Date.now(),
      cloudSynced: true,
    });

    // Fetch and persist all slides
    const slides = await convex.query(api.slides.listSlides, { presentationId });
    const slideIds: string[] = [];

    for (const slide of slides) {
      const snapshot: StoredSlideSnapshot = {
        slideId: slide.slideId,
        presentationId,
        slideIndex: slide.slideIndex,
        engine: slide.engine,
        sceneVersion: slide.sceneVersion,
        snapshotJson: slide.snapshotJson ?? null,
        elementsJson: slide.elementsJson ?? null,
        appStateJson: slide.appStateJson ?? null,
        filesJson: null,
        createdAt: slide.createdAt,
        updatedAt: slide.updatedAt,
        syncedAt: Date.now(),
      };

      // Rehydrate convexUrl refs to real serving URLs
      const rehydrated = await rehydrateSnapshot(snapshot, convex);
      await setSlideSnapshot(rehydrated);
      slideIds.push(slide.slideId);
    }

    // Update slideIds in meta
    await setPresentationMeta({
      presentationId: meta.presentationId,
      name: meta.name,
      canvasEngine: meta.canvasEngine,
      folderId: meta.folderId ?? null,
      currentSlideIndex: meta.currentSlideIndex,
      slideIds,
      version: meta.version,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
      syncedAt: Date.now(),
      cloudSynced: true,
    });

    return slideIds;
  } catch (err) {
    console.error("[sync] pullPresentation failed", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hydrate: IndexedDB → Zustand (on page load)
// ---------------------------------------------------------------------------

/**
 * Reconstruct canvas-heavy SlideData from a stored snapshot.
 * Problem baseline fields are NOT stored in IDB — they stay in Zustand only
 * (they're volatile edit-session state, not durable data).
 */
export function snapshotToSlideData(snapshot: StoredSlideSnapshot): SlideData {
  const base = {
    id: snapshot.slideId,
    sceneVersion: snapshot.sceneVersion,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
  };

  if (snapshot.engine === "excalidraw") {
    const slide: ExcalidrawSlideData = {
      ...base,
      engine: "excalidraw",
      elements: snapshot.elementsJson ? JSON.parse(snapshot.elementsJson) : [],
      appState: snapshot.appStateJson ? JSON.parse(snapshot.appStateJson) : {},
      files: snapshot.filesJson ? JSON.parse(snapshot.filesJson) : {},
    };
    return slide;
  }

  const slide: TldrawSlideData = {
    ...base,
    engine: "tldraw",
    snapshot: snapshot.snapshotJson ? JSON.parse(snapshot.snapshotJson) : null,
  };
  return slide;
}

/**
 * Load all slide snapshots for a presentation from IndexedDB and return them
 * as SlideData objects, ordered by slideIndex.
 *
 * Called by the presentation page to hydrate Zustand after the lightweight
 * localStorage stubs are rehydrated but canvas data is missing.
 */
export async function loadSlidesFromCache(
  presentationId: string,
): Promise<{ slideId: string; slideData: SlideData }[]> {
  try {
    const snapshots = await getSlideSnapshotsByPresentation(presentationId);
    snapshots.sort((a, b) => a.slideIndex - b.slideIndex);
    return snapshots.map((s) => ({
      slideId: s.slideId,
      slideData: snapshotToSlideData(s),
    }));
  } catch (err) {
    console.error("[sync] loadSlidesFromCache failed", err);
    return [];
  }
}

/**
 * Load a single slide from IndexedDB by slideId.
 */
export async function loadSlideFromCache(
  slideId: string,
): Promise<SlideData | null> {
  try {
    const snapshot = await getSlideSnapshot(slideId);
    if (!snapshot) return null;
    return snapshotToSlideData(snapshot);
  } catch (err) {
    console.error("[sync] loadSlideFromCache failed", err);
    return null;
  }
}
