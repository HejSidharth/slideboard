"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { usePresentationStore } from "@/store/use-presentation-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { SlideSidebar } from "@/components/editor/slide-sidebar";
import { SlideControls } from "@/components/editor/slide-controls";
import { ChatSheet } from "@/components/chat/chat-sheet";
import {
  ArrowLeft,
  Play,
  Plus,
  Download,
  Pencil,
  Check,
  X,
} from "lucide-react";
import type { ExcalidrawElement, BinaryFiles, AppState, ExcalidrawImperativeAPI } from "@/types";

// Dynamically import Excalidraw wrapper
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
  }
);

export default function PresentationEditorPage() {
  const params = useParams();
  const router = useRouter();
  const presentationId = params.id as string;
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const presentation = usePresentationStore((s) =>
    s.presentations.find((p) => p.id === presentationId)
  );
  const updateSlide = usePresentationStore((s) => s.updateSlide);
  const renamePresentation = usePresentationStore((s) => s.renamePresentation);
  const addSlide = usePresentationStore((s) => s.addSlide);
  const exportPresentation = usePresentationStore((s) => s.exportPresentation);

  // Debounce timer ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentSlide = useMemo(() => {
    if (!presentation) return null;
    return presentation.slides[presentation.currentSlideIndex];
  }, [presentation]);

  const handleChange = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles
    ) => {
      if (!presentation || !currentSlide) return;

      // Debounce saves
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        updateSlide(presentationId, presentation.currentSlideIndex, {
          elements,
          appState: {
            scrollX: appState.scrollX,
            scrollY: appState.scrollY,
            zoom: appState.zoom,
            viewBackgroundColor: appState.viewBackgroundColor,
          },
          files,
        });
      }, 300);
    },
    [presentation, currentSlide, presentationId, updateSlide]
  );

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

  if (!presentation) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Presentation not found</h1>
          <p className="text-muted-foreground mb-4">
            This presentation may have been deleted or doesn't exist.
          </p>
          <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Toolbar */}
      <header className="flex h-14 items-center justify-between border-b px-4 shrink-0">
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

          {/* Presentation Name */}
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveRename();
                  if (e.key === "Escape") handleCancelRename();
                }}
                className="h-8 w-48"
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
              <h1 className="font-semibold truncate max-w-[200px]">{presentation.name}</h1>
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
            <TooltipContent>Add Slide</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6" />

          <ThemeToggle />

          <Button onClick={handlePresent} className="gap-2">
            <Play className="h-4 w-4" />
            Present
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Slide Sidebar */}
        <SlideSidebar
          presentation={presentation}
          presentationId={presentationId}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />

        {/* Canvas Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            {currentSlide && (
              <ExcalidrawWrapper
                key={currentSlide.id}
                initialElements={currentSlide.elements}
                initialAppState={currentSlide.appState}
                initialFiles={currentSlide.files}
                onChange={handleChange}
              />
            )}
          </div>

          {/* Slide Controls */}
          <SlideControls
            presentation={presentation}
            presentationId={presentationId}
          />
        </main>
      </div>

      {/* AI Chat Sidebar */}
      <ChatSheet />
    </div>
  );
}
