"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ComponentType } from "react";
import { useTheme } from "next-themes";
import "@excalidraw/excalidraw/index.css";
import type { AppState, BinaryFiles, ExcalidrawElement } from "@/types";
import { sanitizeExcalidrawElementIndices } from "@/lib/excalidraw-indices";

const ExcalidrawComponent = dynamic(
  async () => {
    const mod = await import("@excalidraw/excalidraw");
    return mod.Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading canvas...</span>
        </div>
      </div>
    ),
  },
) as ComponentType<Record<string, unknown>>;

interface ExcalidrawWrapperProps {
  initialElements?: readonly ExcalidrawElement[];
  initialAppState?: Partial<AppState>;
  initialFiles?: BinaryFiles;
  /**
   * Live elements pushed from the presenter via Convex.
   * When provided and `isReadonly` is true, the canvas applies them via
   * `updateScene` so the viewer sees the presenter's shapes in near-real-time.
   */
  liveElements?: readonly ExcalidrawElement[] | null;
  onChange?: (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => void;
  onReady?: (api: unknown) => void;
  isReadonly?: boolean;
}

interface ExcalidrawApiLike {
  updateScene?: (sceneData: {
    elements?: readonly ExcalidrawElement[];
    appState?: Partial<AppState>;
  }) => void;
}

function normalizeInitialAppState(appState: Partial<AppState>): Partial<AppState> {
  const nextState = { ...appState } as Partial<AppState> & { collaborators?: unknown };

  if (nextState.collaborators && !(nextState.collaborators instanceof Map)) {
    delete nextState.collaborators;
  }

  return nextState;
}

export default function ExcalidrawWrapper({
  initialElements = [],
  initialAppState = {},
  initialFiles = {},
  liveElements,
  onChange,
  onReady,
  isReadonly = false,
}: ExcalidrawWrapperProps) {
  const { resolvedTheme } = useTheme();
  const apiRef = useRef<ExcalidrawApiLike | null>(null);

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      if (isReadonly) return;
      onChange?.(elements, appState, files);
    },
    [isReadonly, onChange],
  );

  const initialData = useMemo(
    () => {
      const { elements: normalizedInitialElements } =
        sanitizeExcalidrawElementIndices(initialElements);

      return {
        elements: normalizedInitialElements,
        appState: normalizeInitialAppState(initialAppState),
        files: initialFiles,
      };
    },
    [initialAppState, initialElements, initialFiles],
  );

  const handleApiReady = useCallback(
    (api: unknown) => {
      apiRef.current = api as ExcalidrawApiLike;
      onReady?.(api);
    },
    [onReady],
  );

  useEffect(() => {
    const api = apiRef.current;
    if (!api?.updateScene) return;

    const theme = resolvedTheme === "dark" ? "dark" : "light";
    api.updateScene({ appState: { theme } });
  }, [resolvedTheme]);

  // Apply live elements from the presenter (viewer-side, readonly only).
  // Called imperatively so we don't remount the Excalidraw instance.
  useEffect(() => {
    if (!isReadonly) return;
    if (!liveElements) return;
    const api = apiRef.current;
    if (!api?.updateScene) return;
    const { elements: normalizedLiveElements } =
      sanitizeExcalidrawElementIndices(liveElements);
    api.updateScene({ elements: normalizedLiveElements });
  }, [liveElements, isReadonly]);

  return (
    <div className="h-full w-full">
      <ExcalidrawComponent
        initialData={initialData}
        excalidrawAPI={handleApiReady}
        onChange={handleChange}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        viewModeEnabled={isReadonly}
        zenModeEnabled={isReadonly}
        gridModeEnabled={false}
        UIOptions={{
          canvasActions: {
            saveToActiveFile: false,
            loadScene: false,
            export: false,
            saveAsImage: false,
            toggleTheme: false,
          },
        }}
      />
    </div>
  );
}
