"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { usePresentationStore } from "@/store/use-presentation-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SlideSidebar } from "@/components/editor/slide-sidebar";
import { SlideControls } from "@/components/editor/slide-controls";
import { ChatPanel } from "@/components/chat/chat-panel";
import {
  ArrowLeft,
  Play,
  Plus,
  Download,
  Pencil,
  Check,
  X,
} from "lucide-react";
import type { AppState, BinaryFiles, ExcalidrawElement, StoreSnapshot, TLRecord } from "@/types";

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
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("slideboard-assistant-open") !== "0";
  });
  const canvasRegionRef = useRef<HTMLDivElement | null>(null);
  const wheelDebugCountRef = useRef(0);
  const excalidrawSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleStartRename = () => {
    if (!presentation) return;
    setEditedName(presentation.name);
    setIsEditingName(true);
  };

  const handleSaveRename = () => {
    if (editedName.trim() && presentation) {
      renamePresentation(presentationId, editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleCancelRename = () => {
    setIsEditingName(false);
    setEditedName("");
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

  useEffect(() => {
    localStorage.setItem("slideboard-assistant-open", assistantOpen ? "1" : "0");
  }, [assistantOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCmdJ = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j";
      if (!isCmdJ) return;
      event.preventDefault();
      setAssistantOpen((open) => !open);
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
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-5">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to Dashboard</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6" />

          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveRename();
                  if (e.key === "Escape") handleCancelRename();
                }}
                className="h-9 w-64"
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveRename}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelRename}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="max-w-[300px] truncate text-sm font-semibold tracking-tight md:text-base">{presentation.name}</h1>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleStartRename}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
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

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant="outline"
            className="h-9 px-3 text-xs"
            onClick={() => setAssistantOpen((open) => !open)}
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
                    key={currentSlide.id}
                    initialElements={currentSlide.engine === "excalidraw" ? currentSlide.elements : []}
                    initialAppState={currentSlide.engine === "excalidraw" ? currentSlide.appState : {}}
                    initialFiles={currentSlide.engine === "excalidraw" ? currentSlide.files : {}}
                    onChange={handleExcalidrawChange}
                  />
                ) : (
                  <TldrawWrapper
                    key={currentSlide.id}
                    slideId={currentSlide.id}
                    snapshot={currentSlide.engine === "tldraw" ? currentSlide.snapshot : null}
                    onChange={handleChange}
                  />
                )
              )}
            </div>

            <SlideControls
              presentation={presentation}
              presentationId={presentationId}
            />
          </main>

          {assistantOpen && (
            <div className="w-[360px] shrink-0 border-l border-border bg-background">
              <ChatPanel className="h-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
