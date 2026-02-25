"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import "tldraw/tldraw.css";
import { Tldraw, getSnapshot, loadSnapshot } from "tldraw";
import type { Editor, StoreSnapshot, TLRecord } from "tldraw";
import { deleteSlidePreview, setSlidePreview } from "@/lib/slide-previews";

export interface TldrawWrapperProps {
  slideId: string;
  snapshot?: StoreSnapshot<TLRecord> | null;
  /**
   * Live snapshot pushed from the presenter via Convex.
   * When provided and `isReadonly` is true, the canvas applies this state
   * using `mergeRemoteChanges` so it doesn't dirty the undo stack.
   */
  liveSnapshot?: StoreSnapshot<TLRecord> | null;
  onChange?: (snapshot: StoreSnapshot<TLRecord>) => void;
  onReady?: (editor: Editor) => void;
  isReadonly?: boolean;
  licenseKey?: string;
}

let cachedLicenseKey: string | null | undefined;
let licenseRequest: Promise<string | null> | null = null;

async function loadTldrawLicenseKey(): Promise<string | null> {
  if (cachedLicenseKey !== undefined) {
    return cachedLicenseKey;
  }

  if (!licenseRequest) {
    licenseRequest = fetch("/api/tldraw-license", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = (await response.json()) as { licenseKey?: string | null };
        return typeof data.licenseKey === "string" && data.licenseKey.trim().length > 0
          ? data.licenseKey
          : null;
      })
      .catch(() => null)
      .finally(() => {
        licenseRequest = null;
      });
  }

  cachedLicenseKey = await licenseRequest;
  return cachedLicenseKey;
}

function TldrawWrapper({
  slideId,
  snapshot,
  liveSnapshot,
  onChange,
  onReady,
  isReadonly = false,
  licenseKey,
}: TldrawWrapperProps) {
  const { theme, resolvedTheme } = useTheme();
  const editorRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storeCleanupRef = useRef<(() => void) | null>(null);
  const isHydratingRef = useRef(false);
  const [loadedLicenseKey, setLoadedLicenseKey] = useState<string | null>(null);
  const effectiveLicenseKey = licenseKey ?? loadedLicenseKey;

  const canLoadDocumentSnapshot = useCallback((value: unknown): value is StoreSnapshot<TLRecord> => {
    if (!value || typeof value !== "object") return false;
    return "schema" in value;
  }, []);

  const syncEditorTheme = useCallback(
    (editor: Editor) => {
      const colorScheme = theme === "system"
        ? "system"
        : resolvedTheme === "dark"
          ? "dark"
          : "light";

      editor.user.updateUserPreferences({ colorScheme });
    },
    [theme, resolvedTheme],
  );

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (licenseKey !== undefined) {
      return;
    }

    let cancelled = false;

    const hydrateLicense = async () => {
      const key = await loadTldrawLicenseKey();
      if (cancelled) return;
      setLoadedLicenseKey(key);
    };

    void hydrateLicense();

    return () => {
      cancelled = true;
    };
  }, [licenseKey]);

  const flushSnapshot = useCallback(() => {
    const editor = editorRef.current;
    const onChangeHandler = onChangeRef.current;
    if (!editor || !onChangeHandler) return;

    const fullSnapshot = getSnapshot(editor.store);
    onChangeHandler(fullSnapshot.document);
  }, []);

  const updatePreview = useCallback(async () => {
    if (isReadonly) return;
    const editor = editorRef.current;
    if (!editor) return;

    const shapeIds = editor.getCurrentPageShapeIds();
    if (shapeIds.size === 0) {
      await deleteSlidePreview(slideId);
      return;
    }

    try {
      const imageResult = await editor.toImageDataUrl([...shapeIds], {
        format: "png",
        background: true,
        pixelRatio: 0.22,
      });
      if (!imageResult?.url) return;
      await setSlidePreview(slideId, imageResult.url);
    } catch (error) {
      console.error("Failed to update slide preview", error);
    }
  }, [isReadonly, slideId]);

  const handleMount = useCallback(
    (editor: Editor) => {
      storeCleanupRef.current?.();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }

      editorRef.current = editor;
      editor.updateInstanceState({ isReadonly });
      syncEditorTheme(editor);

      if (snapshot && canLoadDocumentSnapshot(snapshot)) {
        isHydratingRef.current = true;
        try {
          loadSnapshot(editor.store, { document: snapshot });
        } catch (error) {
          console.error("Failed to load tldraw snapshot", error);
        } finally {
          isHydratingRef.current = false;
        }
      } else if (snapshot) {
        console.warn("Skipping invalid tldraw snapshot for slide", slideId);
      }

      if (onChangeRef.current) {
        storeCleanupRef.current = editor.store.listen(
          () => {
            if (isHydratingRef.current) return;

            if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
            }

            saveTimeoutRef.current = setTimeout(() => {
              saveTimeoutRef.current = null;
              flushSnapshot();
            }, 300);

            if (!isReadonly) {
              if (previewTimeoutRef.current) {
                clearTimeout(previewTimeoutRef.current);
              }
              previewTimeoutRef.current = setTimeout(() => {
                previewTimeoutRef.current = null;
                void updatePreview();
              }, 900);
            }
          },
          { source: "user", scope: "document" }
        );
      }

      onReady?.(editor);
    },
    [canLoadDocumentSnapshot, flushSnapshot, isReadonly, onReady, slideId, snapshot, syncEditorTheme, updatePreview]
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.updateInstanceState({ isReadonly });
  }, [isReadonly]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    syncEditorTheme(editor);
  }, [syncEditorTheme]);

  // Apply live canvas state from the presenter (viewer-side, readonly only).
  // Uses mergeRemoteChanges so the update doesn't dirty the local undo stack
  // or re-trigger the store listener that feeds `onChange`.
  useEffect(() => {
    if (!isReadonly) return;
    if (!liveSnapshot) return;
    const editor = editorRef.current;
    if (!editor) return;
    if (!canLoadDocumentSnapshot(liveSnapshot)) return;

    try {
      isHydratingRef.current = true;
      editor.store.mergeRemoteChanges(() => {
        loadSnapshot(editor.store, { document: liveSnapshot });
      });
    } catch (err) {
      console.error("[TldrawWrapper] Failed to apply liveSnapshot", err);
    } finally {
      isHydratingRef.current = false;
    }
  }, [liveSnapshot, isReadonly, canLoadDocumentSnapshot]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
        flushSnapshot();
      }
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
        void updatePreview();
      }

      storeCleanupRef.current?.();
      storeCleanupRef.current = null;
      editorRef.current = null;
    };
  }, [flushSnapshot, updatePreview]);

  return (
    <div
      className="h-full w-full tldraw-container"
      style={{ touchAction: isReadonly ? "pan-y" : "none" }}
    >
      <Tldraw
        onMount={handleMount}
        hideUi={isReadonly}
        inferDarkMode
        licenseKey={effectiveLicenseKey ?? undefined}
      />
    </div>
  );
}

export default TldrawWrapper;
