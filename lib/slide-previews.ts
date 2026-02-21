const DB_NAME = "slideboard-previews";
const STORE_NAME = "previews";
const DB_VERSION = 1;

type PreviewRecord = {
  slideId: string;
  dataUrl: string;
  updatedAt: number;
};

const memoryCache = new Map<string, string>();

function supportsIndexedDb(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase | null> {
  if (!supportsIndexedDb()) return Promise.resolve(null);

  return new Promise((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "slideId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.error("Failed opening preview database", request.error);
      resolve(null);
    };
  });
}

export function emitSlidePreviewUpdated(slideId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("slide-preview-updated", { detail: { slideId } }));
}

export async function getSlidePreview(slideId: string): Promise<string | null> {
  if (memoryCache.has(slideId)) {
    return memoryCache.get(slideId) ?? null;
  }

  const db = await openDb();
  if (!db) return null;

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(slideId);

    request.onsuccess = () => {
      const result = request.result as PreviewRecord | undefined;
      if (result?.dataUrl) {
        memoryCache.set(slideId, result.dataUrl);
        resolve(result.dataUrl);
        return;
      }
      resolve(null);
    };

    request.onerror = () => {
      console.error("Failed reading preview", request.error);
      resolve(null);
    };
  });
}

export async function setSlidePreview(slideId: string, dataUrl: string): Promise<void> {
  memoryCache.set(slideId, dataUrl);
  const db = await openDb();
  if (!db) {
    emitSlidePreviewUpdated(slideId);
    return;
  }

  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put({ slideId, dataUrl, updatedAt: Date.now() } satisfies PreviewRecord);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error("Failed writing preview", request.error);
      resolve();
    };
  });

  emitSlidePreviewUpdated(slideId);
}

export async function deleteSlidePreview(slideId: string): Promise<void> {
  memoryCache.delete(slideId);
  const db = await openDb();
  if (!db) {
    emitSlidePreviewUpdated(slideId);
    return;
  }

  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(slideId);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error("Failed deleting preview", request.error);
      resolve();
    };
  });

  emitSlidePreviewUpdated(slideId);
}
