/**
 * IndexedDB cache for slide canvas data and presentation metadata.
 *
 * This sits between the Zustand in-memory store and Convex:
 *   Convex (cloud) ↔ IndexedDB (device cache) ↔ Zustand (in-memory)
 *
 * Canvas data is never stored in localStorage; only tiny metadata keys live there.
 *
 * Database: "slideboard-data" (v1 — previews DB remains separate)
 * Object stores:
 *   "presentation-meta"  — light metadata for each presentation
 *   "slide-snapshots"    — per-slide canvas JSON (stripped of images)
 *   "slide-asset-urls"   — resolved URL cache for images (ephemeral, not synced)
 */

// ---------------------------------------------------------------------------
// DB constants
// ---------------------------------------------------------------------------

const DB_NAME = "slideboard-data";
const DB_VERSION = 1;

const META_STORE = "presentation-meta";
const SNAPSHOT_STORE = "slide-snapshots";
const ASSET_URL_STORE = "slide-asset-urls";

// ---------------------------------------------------------------------------
// Stored types
// ---------------------------------------------------------------------------

export interface StoredPresentationMeta {
  presentationId: string;
  name: string;
  canvasEngine: "tldraw" | "excalidraw";
  folderId: string | null;
  currentSlideIndex: number;
  slideIds: string[];
  version: number;
  createdAt: number;
  updatedAt: number;
  /** Last time this record was pulled from Convex. null = local-only. */
  syncedAt: number | null;
  /** Whether the presentation exists in Convex. */
  cloudSynced: boolean;
}

export interface StoredSlideSnapshot {
  slideId: string;
  presentationId: string;
  slideIndex: number;
  engine: "tldraw" | "excalidraw";
  sceneVersion: number;
  /** tldraw: JSON.stringify(snapshot) with convexUrl refs */
  snapshotJson: string | null;
  /** excalidraw: JSON.stringify(elements) with convexUrl refs */
  elementsJson: string | null;
  /** excalidraw: JSON.stringify(appState) */
  appStateJson: string | null;
  /**
   * excalidraw: the raw files map (dataURLs for local-only slides,
   * convexUrl refs for cloud-synced slides).
   */
  filesJson: string | null;
  createdAt: number;
  updatedAt: number;
  /** Last time pulled from Convex. null = local-only. */
  syncedAt: number | null;
}

export interface StoredAssetUrl {
  /** storageId from Convex File Storage */
  storageId: string;
  /** Resolved serving URL */
  url: string;
  cachedAt: number;
}

// ---------------------------------------------------------------------------
// DB open
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase | null> | null = null;

function supportsIndexedDb(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase | null> {
  if (!supportsIndexedDb()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "presentationId" });
      }

      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        const snap = db.createObjectStore(SNAPSHOT_STORE, { keyPath: "slideId" });
        snap.createIndex("by_presentation", "presentationId", { unique: false });
      }

      if (!db.objectStoreNames.contains(ASSET_URL_STORE)) {
        db.createObjectStore(ASSET_URL_STORE, { keyPath: "storageId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.error("[slideboard-idb] Failed to open database", request.error);
      dbPromise = null;
      resolve(null);
    };
  });

  return dbPromise;
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

function idbGet<T>(db: IDBDatabase, storeName: string, key: string): Promise<T | null> {
  return new Promise((resolve) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => { console.error("[slideboard-idb] get error", req.error); resolve(null); };
  });
}

function idbPut(db: IDBDatabase, storeName: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => { console.error("[slideboard-idb] put error", req.error); resolve(); };
  });
}

function idbDelete(db: IDBDatabase, storeName: string, key: string): Promise<void> {
  return new Promise((resolve) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => { console.error("[slideboard-idb] delete error", req.error); resolve(); };
  });
}

function idbGetAll<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => { console.error("[slideboard-idb] getAll error", req.error); resolve([]); };
  });
}

function idbGetAllByIndex<T>(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  key: string,
): Promise<T[]> {
  return new Promise((resolve) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const req = index.getAll(key);
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => { console.error("[slideboard-idb] getAll index error", req.error); resolve([]); };
  });
}

// ---------------------------------------------------------------------------
// Presentation metadata API
// ---------------------------------------------------------------------------

export async function getPresentationMeta(
  presentationId: string,
): Promise<StoredPresentationMeta | null> {
  const db = await openDb();
  if (!db) return null;
  return idbGet<StoredPresentationMeta>(db, META_STORE, presentationId);
}

export async function getAllPresentationMeta(): Promise<StoredPresentationMeta[]> {
  const db = await openDb();
  if (!db) return [];
  return idbGetAll<StoredPresentationMeta>(db, META_STORE);
}

export async function setPresentationMeta(meta: StoredPresentationMeta): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await idbPut(db, META_STORE, meta);
}

export async function deletePresentationMeta(presentationId: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await idbDelete(db, META_STORE, presentationId);
}

// ---------------------------------------------------------------------------
// Slide snapshot API
// ---------------------------------------------------------------------------

export async function getSlideSnapshot(slideId: string): Promise<StoredSlideSnapshot | null> {
  const db = await openDb();
  if (!db) return null;
  return idbGet<StoredSlideSnapshot>(db, SNAPSHOT_STORE, slideId);
}

export async function getSlideSnapshotsByPresentation(
  presentationId: string,
): Promise<StoredSlideSnapshot[]> {
  const db = await openDb();
  if (!db) return [];
  return idbGetAllByIndex<StoredSlideSnapshot>(db, SNAPSHOT_STORE, "by_presentation", presentationId);
}

export async function setSlideSnapshot(snapshot: StoredSlideSnapshot): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await idbPut(db, SNAPSHOT_STORE, snapshot);
}

export async function deleteSlideSnapshot(slideId: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await idbDelete(db, SNAPSHOT_STORE, slideId);
}

export async function deleteSlideSnapshotsByPresentation(presentationId: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const slides = await getSlideSnapshotsByPresentation(presentationId);
  await Promise.all(slides.map((s) => idbDelete(db, SNAPSHOT_STORE, s.slideId)));
}

// ---------------------------------------------------------------------------
// Asset URL cache API
// ---------------------------------------------------------------------------

export async function getCachedAssetUrl(storageId: string): Promise<string | null> {
  const db = await openDb();
  if (!db) return null;
  const record = await idbGet<StoredAssetUrl>(db, ASSET_URL_STORE, storageId);
  return record?.url ?? null;
}

export async function setCachedAssetUrl(storageId: string, url: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await idbPut(db, ASSET_URL_STORE, { storageId, url, cachedAt: Date.now() } satisfies StoredAssetUrl);
}
