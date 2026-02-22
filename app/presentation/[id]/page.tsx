"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { usePresentationStore } from "@/store/use-presentation-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SlideSidebar } from "@/components/editor/slide-sidebar";
import { SlideControls } from "@/components/editor/slide-controls";
import { ChatPanel } from "@/components/chat/chat-panel";
import { CalculatorPanel } from "@/components/editor/calculator-panel";
import { CalculatorDockPanel } from "@/components/editor/calculator-panel";
import type { CalculatorMode } from "@/components/editor/calculator-panel";
import {
  ArrowLeft,
  Play,
  Plus,
  Download,
  Pencil,
  Calculator,
  ImageDown,
} from "lucide-react";
import type { AppState, BinaryFiles, Editor, ExcalidrawElement, StoreSnapshot, TLRecord } from "@/types";

interface ExcalidrawApiLike {
  getSceneElements: () => readonly ExcalidrawElement[];
  getAppState: () => AppState;
  getFiles: () => BinaryFiles;
}

const TldrawWrapper = dynamic(
  () => import("@/components/editor/tldraw-wrapper"),
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

const ExcalidrawWrapper = dynamic(
  () => import("@/components/editor/excalidraw-wrapper"),
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
);

export default function PresentationEditorPage() {
  const params = useParams();
  const router = useRouter();
  const presentationId = params.id as string;
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("slideboard-assistant-open") === "1";
  });
  const [calculatorOpen, setCalculatorOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`slideboard-calculator-open:${presentationId}`) === "1";
  });
  const [calculatorMode, setCalculatorMode] = useState<CalculatorMode>(() => {
    if (typeof window === "undefined") return "floating";
    const stored = localStorage.getItem("slideboard-calculator-mode");
    return stored === "sheet" ? "sheet" : "floating";
  });
  const canvasRegionRef = useRef<HTMLDivElement | null>(null);
  const wheelDebugCountRef = useRef(0);
  const excalidrawSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tldrawEditorRef = useRef<Editor | null>(null);
  const excalidrawApiRef = useRef<ExcalidrawApiLike | null>(null);
  const calculatorModeRef = useRef(calculatorMode);
  const calculatorOpenRef = useRef(calculatorOpen);

  const presentation = usePresentationStore((s) =>
    s.presentations.find((p) => p.id === presentationId)
  );
  const updateSlide = usePresentationStore((s) => s.updateSlide);
  const renamePresentation = usePresentationStore((s) => s.renamePresentation);
  const addSlide = usePresentationStore((s) => s.addSlide);
  const exportPresentation = usePresentationStore((s) => s.exportPresentation);

  const currentSlide = useMemo(() => {
    if (!presentation) return null;
    return presentation.slides[presentation.currentSlideIndex];
  }, [presentation]);

  const currentSlideId = currentSlide?.id;
  const currentSlideEngine = currentSlide?.engine;
  const currentSlideSceneVersion = currentSlide?.sceneVersion;

  const handleChange = useCallback(
    (snapshot: StoreSnapshot<TLRecord>) => {
      if (!presentation || !currentSlide) return;
      updateSlide(presentationId, presentation.currentSlideIndex, {
        snapshot,
      });
    },
    [presentation, currentSlide, presentationId, updateSlide]
  );

  const handleExcalidrawChange = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      if (!presentation || !currentSlide) return;

      const nextAppState: Partial<AppState> = {
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        zoom: appState.zoom,
        viewBackgroundColor: appState.viewBackgroundColor,
      };

      if (excalidrawSaveTimeoutRef.current) {
        clearTimeout(excalidrawSaveTimeoutRef.current);
      }

      excalidrawSaveTimeoutRef.current = setTimeout(() => {
        updateSlide(presentationId, presentation.currentSlideIndex, {
          elements,
          appState: nextAppState,
          files,
        });
      }, 250);
    },
    [presentation, currentSlide, presentationId, updateSlide],
  );

  useEffect(() => {
    return () => {
      if (excalidrawSaveTimeoutRef.current) {
        clearTimeout(excalidrawSaveTimeoutRef.current);
        excalidrawSaveTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!currentSlideId || currentSlideEngine !== "excalidraw") return;
    if (excalidrawSaveTimeoutRef.current) {
      clearTimeout(excalidrawSaveTimeoutRef.current);
      excalidrawSaveTimeoutRef.current = null;
    }
  }, [currentSlideEngine, currentSlideId, currentSlideSceneVersion]);

  const handleStartRename = () => {
    if (!presentation) return;
    setEditedName(presentation.name);
    setRenameDialogOpen(true);
  };

  const handleSaveRename = () => {
    if (editedName.trim() && presentation) {
      renamePresentation(presentationId, editedName.trim());
    }
    setRenameDialogOpen(false);
  };

  const handleRenameDialogOpenChange = (open: boolean) => {
    setRenameDialogOpen(open);
    if (!open) {
      setEditedName("");
    }
  };

  const handleExport = () => {
    const data = exportPresentation(presentationId);
    if (!data || !presentation) return;

    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${presentation.name.replace(/[^a-z0-9]/gi, "_")}.slideboard.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePresent = () => {
    router.push(`/presentation/${presentationId}/present`);
  };

  const downloadBlob = useCallback((blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const roundedBlob = useCallback(async (blob: Blob, radius = 18): Promise<Blob> => {
    const source = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext("2d");

    if (!context) {
      source.close();
      return blob;
    }

    const clampedRadius = Math.min(radius, Math.floor(Math.min(canvas.width, canvas.height) / 2));

    context.beginPath();
    context.moveTo(clampedRadius, 0);
    context.lineTo(canvas.width - clampedRadius, 0);
    context.quadraticCurveTo(canvas.width, 0, canvas.width, clampedRadius);
    context.lineTo(canvas.width, canvas.height - clampedRadius);
    context.quadraticCurveTo(canvas.width, canvas.height, canvas.width - clampedRadius, canvas.height);
    context.lineTo(clampedRadius, canvas.height);
    context.quadraticCurveTo(0, canvas.height, 0, canvas.height - clampedRadius);
    context.lineTo(0, clampedRadius);
    context.quadraticCurveTo(0, 0, clampedRadius, 0);
    context.closePath();
    context.clip();
    context.drawImage(source, 0, 0);
    source.close();

    return new Promise((resolve) => {
      canvas.toBlob((nextBlob) => resolve(nextBlob ?? blob), "image/png", 1);
    });
  }, []);

  const handleDownloadSlideImage = useCallback(async () => {
    if (!presentation || !currentSlide) return;

    try {
      const fileName = `${presentation.name.replace(/[^a-z0-9]/gi, "_")}-slide-${presentation.currentSlideIndex + 1}.png`;

      if (presentation.canvasEngine === "tldraw") {
        const editor = tldrawEditorRef.current;
        if (!editor) return;

        const shapeIds = [...editor.getCurrentPageShapeIds()];
        if (shapeIds.length === 0) return;

        const image = await editor.toImage(shapeIds, {
          format: "png",
          background: true,
          padding: 48,
          pixelRatio: 2,
        });

        const blob = await roundedBlob(image.blob);
        downloadBlob(blob, fileName);
        return;
      }

      const api = excalidrawApiRef.current;
      if (!api) return;

      const elements = api.getSceneElements();
      if (elements.length === 0) return;
      const appState = api.getAppState();

      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const blob = await exportToBlob({
        elements,
        appState: {
          ...appState,
          exportBackground: true,
          viewBackgroundColor: appState.viewBackgroundColor ?? "#ffffff",
        },
        files: api.getFiles(),
        mimeType: "image/png",
        exportPadding: 48,
      });

      const finalBlob = await roundedBlob(blob);
      downloadBlob(finalBlob, fileName);
    } catch (error) {
      console.error("Failed to export slide image", error);
    }
  }, [currentSlide, downloadBlob, presentation, roundedBlob]);

  const toggleAssistant = useCallback(() => {
    setAssistantOpen((open) => {
      const nextOpen = !open;
      if (nextOpen && calculatorOpenRef.current && calculatorModeRef.current === "sheet") {
        setCalculatorOpen(false);
      }
      return nextOpen;
    });
  }, []);

  const toggleCalculator = useCallback(() => {
    setCalculatorOpen((open) => {
      const nextOpen = !open;
      if (nextOpen && calculatorModeRef.current === "sheet") {
        setAssistantOpen(false);
      }
      return nextOpen;
    });
  }, []);

  useEffect(() => {
    calculatorModeRef.current = calculatorMode;
    calculatorOpenRef.current = calculatorOpen;
  }, [calculatorMode, calculatorOpen]);

  useEffect(() => {
    localStorage.setItem("slideboard-assistant-open", assistantOpen ? "1" : "0");
  }, [assistantOpen]);

  useEffect(() => {
    localStorage.setItem(`slideboard-calculator-open:${presentationId}`, calculatorOpen ? "1" : "0");
  }, [calculatorOpen, presentationId]);

  useEffect(() => {
    localStorage.setItem("slideboard-calculator-mode", calculatorMode);
  }, [calculatorMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCmdJ = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j";
      if (!isCmdJ) return;
      event.preventDefault();
      setAssistantOpen((open) => {
        const nextOpen = !open;
        if (nextOpen && calculatorOpenRef.current && calculatorModeRef.current === "sheet") {
          setCalculatorOpen(false);
        }
        return nextOpen;
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const canvasRegion = canvasRegionRef.current;
    if (!canvasRegion) return;

    const listenerOptions: AddEventListenerOptions = { passive: false, capture: true };

    const handleWheel = (event: WheelEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!canvasRegion.contains(event.target)) return;

      if (event.ctrlKey) return;

      const horizontalDominant = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (wheelDebugCountRef.current < 20) {
        console.log("[editor-wheel]", {
          deltaX: event.deltaX,
          deltaY: event.deltaY,
          cancelable: event.cancelable,
          horizontalDominant,
        });
        wheelDebugCountRef.current += 1;
      }

      if (horizontalDominant && event.cancelable) {
        console.log("[editor-wheel] preventDefault horizontal swipe");
        event.preventDefault();
      }
    };

    const handleGesture = (event: Event) => {
      if (!(event.target instanceof Node)) return;
      if (!canvasRegion.contains(event.target)) return;
      console.log("[editor-gesture]", event.type);
      if (event.cancelable) {
        event.preventDefault();
      }
    };

    const handlePopState = (event: PopStateEvent) => {
      console.log("[editor-popstate] blocking browser back gesture", event.state);
      history.pushState({ slideboardEditorGuard: true }, "", location.href);
    };

    document.documentElement.classList.add("editor-gesture-lock");
    document.body.classList.add("editor-gesture-lock");
    history.pushState({ slideboardEditorGuard: true }, "", location.href);
    window.addEventListener("wheel", handleWheel, listenerOptions);
    window.addEventListener("gesturestart", handleGesture, listenerOptions);
    window.addEventListener("gesturechange", handleGesture, listenerOptions);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.documentElement.classList.remove("editor-gesture-lock");
      document.body.classList.remove("editor-gesture-lock");
      window.removeEventListener("wheel", handleWheel, true);
      window.removeEventListener("gesturestart", handleGesture, true);
      window.removeEventListener("gesturechange", handleGesture, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  if (!presentation) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Deck not found</h1>
          <p className="text-muted-foreground mb-4">
            This SlideBoard deck may have been deleted or no longer exists.
          </p>
          <Button onClick={() => router.push("/dashboard")}>Return to Workspace</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-3 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to Dashboard</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex min-w-0 items-center gap-2">
            <h1 className="max-w-[120px] truncate text-sm font-semibold tracking-tight sm:max-w-[220px] md:max-w-[300px] md:text-base">{presentation.name}</h1>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleStartRename}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => addSlide(presentationId)}>
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add slide</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export deck</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCalculator}
              >
                <Calculator className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {calculatorOpen
                ? "Hide calculator"
                : calculatorMode === "sheet"
                  ? "Show calculator (sheet)"
                  : "Show calculator"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleDownloadSlideImage}>
                <ImageDown className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download slide image</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant="outline"
            className="h-9 px-3 text-xs"
            onClick={toggleAssistant}
          >
            {assistantOpen ? "Hide Assistant" : "Show Assistant"}
          </Button>

          <Button onClick={handlePresent} className="gap-2 px-5">
            <Play className="h-4 w-4" />
            Present
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <SlideSidebar
          presentation={presentation}
          presentationId={presentationId}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />

        <div className="flex flex-1 overflow-hidden">
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div ref={canvasRegionRef} className="relative flex-1 overscroll-x-none">
              {currentSlide && (
                presentation.canvasEngine === "excalidraw" ? (
                  <ExcalidrawWrapper
                    key={`${currentSlide.id}:${currentSlide.sceneVersion}`}
                    initialElements={currentSlide.engine === "excalidraw" ? currentSlide.elements : []}
                    initialAppState={currentSlide.engine === "excalidraw" ? currentSlide.appState : {}}
                    initialFiles={currentSlide.engine === "excalidraw" ? currentSlide.files : {}}
                    onChange={handleExcalidrawChange}
                    onReady={(api) => {
                      excalidrawApiRef.current = api as ExcalidrawApiLike;
                    }}
                  />
                ) : (
                  <TldrawWrapper
                    key={`${currentSlide.id}:${currentSlide.sceneVersion}`}
                    slideId={currentSlide.id}
                    snapshot={currentSlide.engine === "tldraw" ? currentSlide.snapshot : null}
                    onChange={handleChange}
                    onReady={(editor) => {
                      tldrawEditorRef.current = editor;
                    }}
                  />
                )
              )}

              {calculatorOpen && (
                calculatorMode === "floating" ? (
                  <CalculatorPanel
                    key={`${presentationId}:${calculatorMode}`}
                    presentationId={presentationId}
                    onModeChange={(mode) => {
                      setCalculatorMode(mode);
                      if (mode === "sheet") {
                        setAssistantOpen(false);
                      }
                    }}
                    onClose={() => setCalculatorOpen(false)}
                  />
                ) : null
              )}
            </div>

            <SlideControls
              presentation={presentation}
              presentationId={presentationId}
            />
          </main>

          {calculatorOpen && calculatorMode === "sheet" ? (
            <div className="w-[400px] shrink-0 border-l border-border bg-background">
              <CalculatorDockPanel
                className="h-full"
                onModeChange={(mode) => setCalculatorMode(mode)}
                onClose={() => setCalculatorOpen(false)}
              />
            </div>
          ) : assistantOpen ? (
            <div className="w-[360px] shrink-0 border-l border-border bg-background">
              <ChatPanel className="h-full" />
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={renameDialogOpen} onOpenChange={handleRenameDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename deck</DialogTitle>
            <DialogDescription>
              Choose a new name for this deck.
            </DialogDescription>
          </DialogHeader>

          <Input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSaveRename();
              }
            }}
            placeholder="Deck name"
            autoFocus
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => handleRenameDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRename} disabled={!editedName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
