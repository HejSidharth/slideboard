/**
 * Asset extraction utilities for stripping inline base64 images from
 * Excalidraw and tldraw canvas data before storing in Convex DB.
 *
 * Images are uploaded to Convex File Storage. Their original positions in the
 * JSON are replaced with a `convexUrl:{storageId}` reference string. On load,
 * these references are resolved back to real serving URLs.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AssetUploadResult {
  assetKey: string;
  storageId: string;
  mimeType: string;
  sizeBytes: number;
  contentHash: string;
}

export interface UploadAssetFn {
  (blob: Blob, mimeType: string, contentHash: string): Promise<string>;
}

export interface CheckExistingHashFn {
  (contentHash: string): Promise<string | null>;
}

// Prefix used to mark storage references embedded in JSON strings
export const CONVEX_URL_PREFIX = "convexUrl:";

// ---------------------------------------------------------------------------
// SHA-256 hashing (browser-native SubtleCrypto)
// ---------------------------------------------------------------------------

export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Base64 data URL helpers
// ---------------------------------------------------------------------------

/**
 * Converts a base64 data URL (e.g. "data:image/jpeg;base64,/9j/...")
 * into an ArrayBuffer + mimeType.
 */
export function dataUrlToBuffer(dataUrl: string): { buffer: ArrayBuffer; mimeType: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1];
  const base64 = match[2];
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return { buffer: bytes.buffer, mimeType };
}

/**
 * Converts an ArrayBuffer back to a base64 data URL.
 */
export function bufferToDataUrl(buffer: ArrayBuffer, mimeType: string): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

// ---------------------------------------------------------------------------
// Excalidraw: strip images from the `files` map
// ---------------------------------------------------------------------------

/**
 * Strips all base64 image data from an Excalidraw `files` map.
 * Uploads each unique image to Convex File Storage.
 *
 * Returns:
 *  - strippedFiles: the files map with dataURLs replaced by convexUrl refs
 *  - assets: metadata about each uploaded asset
 */
export async function extractExcalidrawAssets(
  presentationId: string,
  slideId: string,
  files: Record<string, unknown>,
  uploadAsset: UploadAssetFn,
  checkExistingHash: CheckExistingHashFn,
): Promise<{
  strippedFiles: Record<string, unknown>;
  assets: AssetUploadResult[];
}> {
  const strippedFiles: Record<string, unknown> = {};
  const assets: AssetUploadResult[] = [];

  for (const [fileId, fileEntry] of Object.entries(files)) {
    if (!fileEntry || typeof fileEntry !== "object") {
      strippedFiles[fileId] = fileEntry;
      continue;
    }

    const entry = fileEntry as Record<string, unknown>;
    const dataURL = entry.dataURL as string | undefined;

    if (!dataURL || typeof dataURL !== "string" || !dataURL.startsWith("data:")) {
      // Already a convexUrl ref or not a data URL — pass through unchanged
      strippedFiles[fileId] = fileEntry;
      continue;
    }

    const parsed = dataUrlToBuffer(dataURL);
    if (!parsed) {
      strippedFiles[fileId] = fileEntry;
      continue;
    }

    const contentHash = await sha256Hex(parsed.buffer);

    // Check if this exact image is already stored for this presentation
    let storageId = await checkExistingHash(contentHash);

    if (!storageId) {
      const blob = new Blob([parsed.buffer], { type: parsed.mimeType });
      storageId = await uploadAsset(blob, parsed.mimeType, contentHash);
    }

    // Replace the dataURL with a convexUrl reference
    strippedFiles[fileId] = {
      ...entry,
      dataURL: `${CONVEX_URL_PREFIX}${storageId}`,
    };

    assets.push({
      assetKey: fileId,
      storageId,
      mimeType: parsed.mimeType,
      sizeBytes: parsed.buffer.byteLength,
      contentHash,
    });
  }

  return { strippedFiles, assets };
}

/**
 * Re-hydrates an Excalidraw `files` map by resolving convexUrl refs
 * back to real serving URLs.
 *
 * resolveUrl: (storageId) => serving URL (e.g. from ctx.storage.getUrl)
 */
export async function rehydrateExcalidrawFiles(
  files: Record<string, unknown>,
  resolveUrl: (storageId: string) => Promise<string | null>,
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};

  for (const [fileId, fileEntry] of Object.entries(files)) {
    if (!fileEntry || typeof fileEntry !== "object") {
      result[fileId] = fileEntry;
      continue;
    }

    const entry = fileEntry as Record<string, unknown>;
    const dataURL = entry.dataURL as string | undefined;

    if (!dataURL || !dataURL.startsWith(CONVEX_URL_PREFIX)) {
      result[fileId] = fileEntry;
      continue;
    }

    const storageId = dataURL.slice(CONVEX_URL_PREFIX.length);
    const url = await resolveUrl(storageId);

    result[fileId] = {
      ...entry,
      dataURL: url ?? dataURL, // fall back to the ref string if URL not found
    };
  }

  return result;
}

// ---------------------------------------------------------------------------
// tldraw: strip images from the snapshot store
// ---------------------------------------------------------------------------

type TldrawStore = Record<string, unknown>;

/**
 * Strips all base64 image data from a tldraw snapshot's store.
 * Asset records with typeName "asset" and props.src starting with "data:"
 * are extracted and uploaded.
 *
 * Returns:
 *  - strippedStore: the store with asset src values replaced by convexUrl refs
 *  - assets: metadata about each uploaded asset
 */
export async function extractTldrawAssets(
  presentationId: string,
  slideId: string,
  store: TldrawStore,
  uploadAsset: UploadAssetFn,
  checkExistingHash: CheckExistingHashFn,
): Promise<{
  strippedStore: TldrawStore;
  assets: AssetUploadResult[];
}> {
  const strippedStore: TldrawStore = { ...store };
  const assets: AssetUploadResult[] = [];

  for (const [recordId, record] of Object.entries(store)) {
    if (!record || typeof record !== "object") continue;

    const rec = record as Record<string, unknown>;
    if (rec.typeName !== "asset") continue;

    const props = rec.props as Record<string, unknown> | undefined;
    if (!props) continue;

    const src = props.src as string | undefined;
    if (!src || typeof src !== "string" || !src.startsWith("data:")) continue;

    const parsed = dataUrlToBuffer(src);
    if (!parsed) continue;

    const contentHash = await sha256Hex(parsed.buffer);
    let storageId = await checkExistingHash(contentHash);

    if (!storageId) {
      const blob = new Blob([parsed.buffer], { type: parsed.mimeType });
      storageId = await uploadAsset(blob, parsed.mimeType, contentHash);
    }

    strippedStore[recordId] = {
      ...rec,
      props: {
        ...props,
        src: `${CONVEX_URL_PREFIX}${storageId}`,
      },
    };

    assets.push({
      assetKey: recordId,
      storageId,
      mimeType: parsed.mimeType,
      sizeBytes: parsed.buffer.byteLength,
      contentHash,
    });
  }

  return { strippedStore, assets };
}

/**
 * Re-hydrates a tldraw store by resolving convexUrl refs back to real URLs.
 */
export async function rehydrateTldrawStore(
  store: TldrawStore,
  resolveUrl: (storageId: string) => Promise<string | null>,
): Promise<TldrawStore> {
  const result: TldrawStore = { ...store };

  for (const [recordId, record] of Object.entries(store)) {
    if (!record || typeof record !== "object") continue;

    const rec = record as Record<string, unknown>;
    if (rec.typeName !== "asset") continue;

    const props = rec.props as Record<string, unknown> | undefined;
    if (!props) continue;

    const src = props.src as string | undefined;
    if (!src || !src.startsWith(CONVEX_URL_PREFIX)) continue;

    const storageId = src.slice(CONVEX_URL_PREFIX.length);
    const url = await resolveUrl(storageId);

    result[recordId] = {
      ...rec,
      props: {
        ...props,
        src: url ?? src,
      },
    };
  }

  return result;
}
