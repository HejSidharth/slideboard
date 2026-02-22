"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";
import type { ComponentType } from "react";
import { useTheme } from "next-themes";
import "@excalidraw/excalidraw/index.css";
import type { AppState, BinaryFiles, ExcalidrawElement } from "@/types";

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
  onChange?: (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => void;
  isReadonly?: boolean;
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
  onChange,
  isReadonly = false,
}: ExcalidrawWrapperProps) {
  const { resolvedTheme } = useTheme();

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      if (isReadonly) return;
      onChange?.(elements, appState, files);
    },
    [isReadonly, onChange],
  );

  const initialData = useMemo(
    () => ({
      elements: initialElements,
      appState: normalizeInitialAppState(initialAppState),
      files: initialFiles,
    }),
    [initialAppState, initialElements, initialFiles],
  );

  return (
    <div className="h-full w-full">
      <ExcalidrawComponent
        initialData={initialData}
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
