"use client";

import dynamic from "next/dynamic";
import { forwardRef, useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawElement, BinaryFiles, AppState, ExcalidrawImperativeAPI } from "@/types";

// Dynamically import Excalidraw to avoid SSR issues
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
  }
);

export interface ExcalidrawWrapperProps {
  initialElements?: readonly ExcalidrawElement[];
  initialAppState?: Partial<AppState>;
  initialFiles?: BinaryFiles;
  onChange?: (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles
  ) => void;
  onReady?: (api: ExcalidrawImperativeAPI) => void;
  viewModeEnabled?: boolean;
  zenModeEnabled?: boolean;
  gridModeEnabled?: boolean;
}

const ExcalidrawWrapper = forwardRef<ExcalidrawImperativeAPI | null, ExcalidrawWrapperProps>(
  (
    {
      initialElements = [],
      initialAppState = {},
      initialFiles = {},
      onChange,
      onReady,
      viewModeEnabled = false,
      zenModeEnabled = false,
      gridModeEnabled = false,
    },
    ref
  ) => {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    // Prevent browser back/forward navigation gestures on macOS Chrome
    // by setting overscrollBehaviorX on the document element (like Excalidraw does internally)
    useEffect(() => {
      const originalValue = document.documentElement.style.overscrollBehaviorX;
      document.documentElement.style.overscrollBehaviorX = "none";

      return () => {
        document.documentElement.style.overscrollBehaviorX = originalValue;
      };
    }, []);

    const handleExcalidrawAPI = useCallback(
      (api: ExcalidrawImperativeAPI) => {
        if (ref && typeof ref === "object") {
          (ref as React.MutableRefObject<ExcalidrawImperativeAPI | null>).current = api;
        }
        onReady?.(api);
      },
      [ref, onReady]
    );

    const handleChange = useCallback(
      (
        elements: readonly ExcalidrawElement[],
        appState: AppState,
        files: BinaryFiles
      ) => {
        onChange?.(elements, appState, files);
      },
      [onChange]
    );

    if (!mounted) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      );
    }

    // Determine the correct background color based on theme
    const darkBgColor = "#ffffff";  // White for dark mode
    const lightBgColor = "#000000"; // Black for light mode
    const themeBgColor = resolvedTheme === "dark" ? darkBgColor : lightBgColor;

    return (
      <div className="h-full w-full">
        <ExcalidrawComponent
          excalidrawAPI={handleExcalidrawAPI}
          initialData={{
            elements: initialElements as ExcalidrawElement[],
            appState: {
              ...initialAppState,
              // Always use theme-appropriate background color
              viewBackgroundColor: themeBgColor,
            },
            files: initialFiles,
          }}
          onChange={handleChange}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          viewModeEnabled={viewModeEnabled}
          zenModeEnabled={zenModeEnabled}
          gridModeEnabled={gridModeEnabled}
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
);

ExcalidrawWrapper.displayName = "ExcalidrawWrapper";

export default ExcalidrawWrapper;
