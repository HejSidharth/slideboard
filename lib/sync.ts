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
  getCachedAssetUrl,
  setCachedAssetUrl,
  type StoredSlideSnapshot,
} from "@/lib/slide-cache";
import {
  extractExcalidrawAssets,
  extractTldrawAssets,
  rehydrateExcalidrawFiles,
  rehydrateTldrawStore,
} from "@/lib/asset-extractor";
import { sanitizeExcalidrawElementIndices } from "@/lib/excalidraw-indices";
import { getOrCreateOwnerToken } from "@/hooks/use-owner-token";
import type {
  Presentation,
  SlideData,
  ExcalidrawSlideData,
  TldrawSlideData,
  EmbedSlideData,
  SlideMcqCanvasAsset,
  SlideMcqDraft,
} from "@/types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getConvexUrl(): string {
  return process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
}

function getConvexSiteUrl(): string {
  return process.env.NEXT_PUBLIC_CONVEX_SITE_URL
    ?? process.env.NEXT_PUBLIC_CONVEX_URL
    ?? "";
}

function buildConvexAssetUrl(storageId: string): string | null {
  const convexSiteUrl = getConvexSiteUrl().replace(/\/$/, "");
  if (!convexSiteUrl) return null;
  return `${convexSiteUrl}/asset?id=${storageId}`;
}

/**
 * Upload a binary blob to Convex File Storage via the HTTP action endpoint.
 * Returns the storageId.
 */
async function uploadBlobToConvex(
  convex: ConvexReactClient,
  blob: Blob,
  mimeType: string,
  presentationId: string,
  ownerToken: string,
): Promise<string> {
  const uploadUrl = await convex.mutation(api.slides.generateUploadUrl, {
    presentationId,
    ownerToken,
  });

  if (!uploadUrl) {
    throw new Error("Unauthorized upload URL request.");
  }

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: { "content-type": mimeType },
    body: blob,
  });

  if (uploadRes.ok) {
    const json = await uploadRes.json() as { storageId: string };
    if (!json.storageId) {
      throw new Error("Upload succeeded but storageId was missing.");
    }
    return json.storageId;
  }

  // Fallback for deployments still using HTTP actions only.
  const convexUrl = getConvexUrl();
  if (!convexUrl) {
    throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
  }

  const fallbackUrls = [
    `${convexUrl.replace(/\/$/, "")}/upload-asset`,
    `${convexUrl.replace(/\/$/, "")}/api/upload-asset`,
  ];

  for (const fallbackUrl of fallbackUrls) {
    const fallbackRes = await fetch(fallbackUrl, {
      method: "POST",
      headers: { "content-type": mimeType },
      body: blob,
    });
    if (!fallbackRes.ok) continue;
    const json = await fallbackRes.json() as { storageId: string };
    if (json.storageId) {
      return json.storageId;
    }
  }

  throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
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

  if (engine === "embed") {
    return;
  }

  if (engine === "excalidraw") {
    const filesJson = snapshot.filesJson;
    const files: Record<string, unknown> = filesJson ? JSON.parse(filesJson) : {};

    const { strippedFiles, assets } = await extractExcalidrawAssets(
      presentationId,
      slideId,
      files,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (blob, mimeType, _hash) => {
        return uploadBlobToConvex(
          convex,
          blob,
          mimeType,
          presentationId,
          ownerToken,
        );
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
      const servingUrl = buildConvexAssetUrl(asset.storageId);
      if (servingUrl) {
        await setCachedAssetUrl(asset.storageId, servingUrl);
      }
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
        return uploadBlobToConvex(
          convex,
          blob,
          mimeType,
          presentationId,
          ownerToken,
        );
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
      const servingUrl = buildConvexAssetUrl(asset.storageId);
      if (servingUrl) {
        await setCachedAssetUrl(asset.storageId, servingUrl);
      }
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
  if (snapshot.engine === "embed") {
    return snapshot;
  }

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

async function rehydrateCachedSnapshot(
  snapshot: StoredSlideSnapshot,
): Promise<StoredSlideSnapshot> {
  if (snapshot.engine === "embed") {
    return snapshot;
  }

  const convexSiteUrl = getConvexSiteUrl().replace(/\/$/, "");
  const resolveUrl = async (storageId: string): Promise<string | null> => {
    const cachedUrl = await getCachedAssetUrl(storageId);
    if (cachedUrl) {
      const normalizedAssetUrl = buildConvexAssetUrl(storageId);
      if (normalizedAssetUrl && /\/asset\?id=/.test(cachedUrl) && cachedUrl !== normalizedAssetUrl) {
        await setCachedAssetUrl(storageId, normalizedAssetUrl);
        return normalizedAssetUrl;
      }
      return cachedUrl;
    }

    if (!convexSiteUrl) {
      return null;
    }

    const fallbackUrl = `${convexSiteUrl}/asset?id=${storageId}`;
    await setCachedAssetUrl(storageId, fallbackUrl);
    return fallbackUrl;
  };

  if (snapshot.engine === "excalidraw") {
    const files: Record<string, unknown> = snapshot.filesJson
      ? JSON.parse(snapshot.filesJson)
      : {};
    const rehydrated = await rehydrateExcalidrawFiles(files, resolveUrl);
    return { ...snapshot, filesJson: JSON.stringify(rehydrated) };
  }

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
  const slideQuestionDraft = snapshot.slideQuestionDraftJson
    ? (JSON.parse(snapshot.slideQuestionDraftJson) as SlideMcqDraft)
    : undefined;
  const slideQuestionAsset = snapshot.slideQuestionAssetJson
    ? (JSON.parse(snapshot.slideQuestionAssetJson) as SlideMcqCanvasAsset)
    : undefined;
  const base = {
    id: snapshot.slideId,
    sceneVersion: snapshot.sceneVersion,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    slideQuestionDraft,
    slideQuestionAsset,
  };

  if (snapshot.engine === "embed") {
    const slide: EmbedSlideData = {
      ...base,
      engine: "embed",
      provider: snapshot.provider ?? "kahoot",
      url: snapshot.url ?? "",
      embedUrl: snapshot.embedUrl ?? null,
      title: snapshot.title ?? "Embedded activity",
      renderMode: snapshot.renderMode ?? "launch-only",
    };
    return slide;
  }

  if (snapshot.engine === "excalidraw") {
    const parsedElements = snapshot.elementsJson ? JSON.parse(snapshot.elementsJson) : [];
    const { elements: normalizedElements } = sanitizeExcalidrawElementIndices(parsedElements);

    const slide: ExcalidrawSlideData = {
      ...base,
      engine: "excalidraw",
      elements: normalizedElements,
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
    const rehydratedSnapshots = await Promise.all(
      snapshots.map((snapshot) => rehydrateCachedSnapshot(snapshot)),
    );
    return rehydratedSnapshots.map((s) => ({
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
    return snapshotToSlideData(await rehydrateCachedSnapshot(snapshot));
  } catch (err) {
    console.error("[sync] loadSlideFromCache failed", err);
    return null;
  }
}
