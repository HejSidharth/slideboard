interface ExcalidrawLibraryApi {
  updateLibrary?: (params: {
    libraryItems: unknown;
    merge?: boolean;
    prompt?: boolean;
    openLibraryMenu?: boolean;
    defaultStatus?: "published" | "unpublished";
  }) => Promise<unknown> | unknown;
}

interface LibraryIndexResponse {
  libraries: string[];
}

const installedApis = new WeakSet<object>();
const installingApis = new WeakMap<object, Promise<void>>();
let cachedLibraryItemsPromise: Promise<readonly unknown[]> | null = null;

function isLibraryIndexResponse(value: unknown): value is LibraryIndexResponse {
  if (!value || typeof value !== "object") return false;
  const libraries = (value as { libraries?: unknown }).libraries;
  return Array.isArray(libraries) && libraries.every((entry) => typeof entry === "string");
}

async function loadBundledLibraryItems(): Promise<readonly unknown[]> {
  if (!cachedLibraryItemsPromise) {
    cachedLibraryItemsPromise = (async () => {
      const response = await fetch("/api/excalidraw-libraries", {
        cache: "no-store",
      });
      if (!response.ok) return [];

      const payload = (await response.json()) as unknown;
      if (!isLibraryIndexResponse(payload) || payload.libraries.length === 0) {
        return [];
      }

      const { loadLibraryFromBlob } = await import("@excalidraw/excalidraw");

      const librarySets = await Promise.all(
        payload.libraries.map(async (libraryPath) => {
          try {
            const libRes = await fetch(libraryPath, { cache: "no-store" });
            if (!libRes.ok) return [];
            const blob = await libRes.blob();
            return (await loadLibraryFromBlob(blob, "published")) as unknown[];
          } catch {
            return [];
          }
        }),
      );

      return librarySets.flat();
    })();
  }

  return cachedLibraryItemsPromise;
}

export async function ensureBundledExcalidrawLibraries(
  api: ExcalidrawLibraryApi | null,
): Promise<void> {
  if (!api?.updateLibrary) return;

  const apiObject = api as object;
  if (installedApis.has(apiObject)) return;

  const inFlight = installingApis.get(apiObject);
  if (inFlight) {
    await inFlight;
    return;
  }

  const installTask = (async () => {
    const libraryItems = await loadBundledLibraryItems();
    if (libraryItems.length === 0) {
      installedApis.add(apiObject);
      return;
    }

    await api.updateLibrary?.({
      libraryItems,
      merge: true,
      prompt: false,
      openLibraryMenu: false,
      defaultStatus: "published",
    });

    installedApis.add(apiObject);
  })();

  installingApis.set(apiObject, installTask);

  try {
    await installTask;
  } finally {
    installingApis.delete(apiObject);
  }
}
