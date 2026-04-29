"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useConvex, useMutation } from "convex/react";
import { nanoid } from "nanoid";
import { getSnapshot } from "tldraw";
import { toast } from "sonner";
import { usePresentationStore } from "@/store/use-presentation-store";
import { loadSlidesFromCache, pushPresentation } from "@/lib/sync";
import { api } from "@/convex/_generated/api";
import {
  getNextValidExcalidrawIndex,
  sanitizeExcalidrawElementIndices,
} from "@/lib/excalidraw-indices";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SlideSidebar } from "@/components/editor/slide-sidebar";
import { SlideControls } from "@/components/editor/slide-controls";
import { ActivityEmbedDialog } from "@/components/editor/activity-embed-dialog";
import { SlideMcqDialog } from "@/components/editor/slide-mcq-dialog";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ActivityPanel } from "@/components/activities/activity-panel";
import { QuestionPanel } from "@/components/questions/question-panel";
import { ShareDialog } from "@/components/editor/share-dialog";
import { ActivityEmbedSlide } from "@/components/slides/activity-embed-slide";
import { SlideMcqCard } from "@/components/slides/slide-mcq-card";
import { CalculatorPanel } from "@/components/editor/calculator-panel";
import { CalculatorDockPanel } from "@/components/editor/calculator-panel";
import { PresentationTimer } from "@/components/editor/presentation-timer";
import { AmbientMusicMenu } from "@/components/editor/ambient-music-menu";
import { captureElementAsPng } from "@/lib/capture-element-png";
import {
  sendChatMessage,
  type ChatMessage as OpenRouterMessage,
  type ChatMessageContentPart,
} from "@/lib/openrouter";
import type { CalculatorMode } from "@/components/editor/calculator-panel";
import { useActivityNotifications } from "@/hooks/use-activity-notifications";
import { useQuestionNotifications } from "@/hooks/use-question-notifications";
import { useHostToken } from "@/hooks/use-host-token";
import { useOwnerToken } from "@/hooks/use-owner-token";
import { useLiveSlideSync } from "@/hooks/use-live-slide-sync";
import type { ActivityEmbedConfig } from "@/lib/activity-embeds";
import {
  ArrowLeft,
  Play,
  Plus,
  Download,
  FileDown,
  Pencil,
  Calculator,
  ImageDown,
  LayoutList,
  Share2,
  HelpCircle,
  Frame,
  ClipboardList,
  Rocket,
} from "lucide-react";
import type {
  AppState,
  BinaryFiles,
  Editor,
  ExcalidrawElement,
  SlideData,
  SlideMcqDraft,
  StoreSnapshot,
  TLRecord,
} from "@/types";

interface ExcalidrawApiLike {
  getSceneElements: () => readonly ExcalidrawElement[];
  getAppState: () => AppState;
  getFiles: () => BinaryFiles;
  addFiles?: (files: Array<{ id: string; dataURL: string; mimeType: string; created: number }>) => void;
  updateScene?: (sceneData: {
    elements?: readonly ExcalidrawElement[];
    appState?: Partial<AppState>;
    files?: BinaryFiles;
    commitToHistory?: boolean;
  }) => void;
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

interface AssistantInsertPayload {
  dataUrl: string;
  width: number;
  height: number;
  target: "current" | "new";
  messageId: string;
}

type PdfExportFormat = "fit" | "a4";
type SlideVisionTask = "summarize_slide" | "solve_slide" | "clean_notes";

export default function PresentationEditorPage() {
  const params = useParams();
  const router = useRouter();
  const presentationId = params.id as string;
  const hasConvex = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [embedDialogMode, setEmbedDialogMode] = useState<"create" | "edit">("create");
  const [slideMcqDialogOpen, setSlideMcqDialogOpen] = useState(false);
  const [embedUrlInput, setEmbedUrlInput] = useState("");
  const [embedTitleInput, setEmbedTitleInput] = useState("");
  const [editedName, setEditedName] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfExportFormat, setPdfExportFormat] = useState<PdfExportFormat>(() => {
    if (typeof window === "undefined") return "fit";
    const stored = localStorage.getItem("slideboard-pdf-export-format");
    return stored === "a4" ? "a4" : "fit";
  });
  const [isExportingDeckPdf, setIsExportingDeckPdf] = useState(false);
  type RightPanelTab = "assistant" | "activities" | "questions" | null;
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("slideboard-right-panel-tab");
    if (stored === "assistant") return stored;
    if (hasConvex && (stored === "activities" || stored === "questions")) return stored;
    return null;
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
  const excalidrawSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tldrawEditorRef = useRef<Editor | null>(null);
  const excalidrawApiRef = useRef<ExcalidrawApiLike | null>(null);
  const tldrawReadySlideIdRef = useRef<string | null>(null);
  const excalidrawReadySlideIdRef = useRef<string | null>(null);
  const visibleEmbedRef = useRef<HTMLDivElement | null>(null);
  const pdfTldrawEditorRef = useRef<Editor | null>(null);
  const pdfExcalidrawApiRef = useRef<ExcalidrawApiLike | null>(null);
  const pdfTldrawReadySlideIdRef = useRef<string | null>(null);
  const pdfExcalidrawReadySlideIdRef = useRef<string | null>(null);
  const pdfEmbedRef = useRef<HTMLDivElement | null>(null);
  const mcqCaptureRef = useRef<HTMLDivElement | null>(null);
  const [pdfRenderSlideIndex, setPdfRenderSlideIndex] = useState<number | null>(null);
  const [mcqCaptureDraft, setMcqCaptureDraft] = useState<SlideMcqDraft | null>(null);
  const calculatorModeRef = useRef(calculatorMode);
  const calculatorOpenRef = useRef(calculatorOpen);
  const rightPanelTabRef = useRef(rightPanelTab);
  const shouldOpenPdfDialogRef = useRef(false);

  const presentation = usePresentationStore((s) =>
    s.presentations.find((p) => p.id === presentationId)
  );
  const updateSlide = usePresentationStore((s) => s.updateSlide);
  const renamePresentation = usePresentationStore((s) => s.renamePresentation);
  const addSlide = usePresentationStore((s) => s.addSlide);
  const addEmbedSlide = usePresentationStore((s) => s.addEmbedSlide);
  const goToNextSlide = usePresentationStore((s) => s.goToNextSlide);
  const goToPreviousSlide = usePresentationStore((s) => s.goToPreviousSlide);
  const exportPresentation = usePresentationStore((s) => s.exportPresentation);
  const hydrateSlides = usePresentationStore((s) => s.hydrateSlides);
  const createHostedQuestion = useMutation(api.hostedQuestions.create);

  // Host token for Q&A moderation — only available on host surfaces
  const hostToken = useHostToken(presentationId);
  // Owner token for live canvas sync writes
  const ownerToken = useOwnerToken(presentationId);

  // ---------------------------------------------------------------------------
  // On mount: hydrate canvas data from IndexedDB (Zustand only holds stubs)
  // ---------------------------------------------------------------------------
  const didHydrateRef = useRef(false);
  useEffect(() => {
    if (didHydrateRef.current) return;
    didHydrateRef.current = true;

    loadSlidesFromCache(presentationId).then((entries) => {
      if (entries.length > 0) {
        hydrateSlides(presentationId, entries.map((e) => e.slideData));
      }
    }).catch(console.error);
  }, [presentationId, hydrateSlides]);

  const currentSlide = useMemo(() => {
    if (!presentation) return null;
    return presentation.slides[presentation.currentSlideIndex];
  }, [presentation]);

  const pdfRenderSlide = useMemo(() => {
    if (!presentation || pdfRenderSlideIndex === null) return null;
    return presentation.slides[pdfRenderSlideIndex] ?? null;
  }, [pdfRenderSlideIndex, presentation]);

  const currentSlideId = currentSlide?.id;
  const currentSlideEngine = currentSlide?.engine;
  const currentSlideSceneVersion = currentSlide?.sceneVersion;

  useEffect(() => {
    tldrawEditorRef.current = null;
    excalidrawApiRef.current = null;
    tldrawReadySlideIdRef.current = null;
    excalidrawReadySlideIdRef.current = null;
    visibleEmbedRef.current = null;
  }, [currentSlideId, currentSlideEngine]);

  useEffect(() => {
    pdfTldrawEditorRef.current = null;
    pdfExcalidrawApiRef.current = null;
    pdfTldrawReadySlideIdRef.current = null;
    pdfExcalidrawReadySlideIdRef.current = null;
    pdfEmbedRef.current = null;
  }, [pdfRenderSlideIndex]);

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

      const { elements: normalizedElements } =
        sanitizeExcalidrawElementIndices(elements);

      const nextAppState: Partial<AppState> = {
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        zoom: appState.zoom,
        viewBackgroundColor: appState.viewBackgroundColor,
        currentItemStrokeWidth:
          typeof appState.currentItemStrokeWidth === "number"
            ? appState.currentItemStrokeWidth
            : 1,
      };

      if (excalidrawSaveTimeoutRef.current) {
        clearTimeout(excalidrawSaveTimeoutRef.current);
      }

      excalidrawSaveTimeoutRef.current = setTimeout(() => {
        updateSlide(presentationId, presentation.currentSlideIndex, {
          elements: normalizedElements,
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

  useEffect(() => {
    if (!presentation || !currentSlide || currentSlide.engine !== "excalidraw") {
      return;
    }

    const { elements: normalizedElements, didRepair } =
      sanitizeExcalidrawElementIndices(
        Array.isArray(currentSlide.elements) ? currentSlide.elements : [],
      );

    if (!didRepair) return;

    updateSlide(presentationId, presentation.currentSlideIndex, {
      elements: normalizedElements,
      appState: currentSlide.appState,
      files: currentSlide.files,
    });
  }, [
    currentSlide,
    presentation,
    presentationId,
    updateSlide,
  ]);

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

  const resetEmbedDialog = useCallback(() => {
    setEmbedUrlInput("");
    setEmbedTitleInput("");
    setEmbedDialogMode("create");
  }, []);

  const openCreateEmbedDialog = useCallback(() => {
    resetEmbedDialog();
    setEmbedDialogMode("create");
    setEmbedDialogOpen(true);
  }, [resetEmbedDialog]);

  const openEditEmbedDialog = useCallback(() => {
    if (!currentSlide || currentSlide.engine !== "embed") return;
    setEmbedDialogMode("edit");
    setEmbedUrlInput(currentSlide.url);
    setEmbedTitleInput(currentSlide.title);
    setEmbedDialogOpen(true);
  }, [currentSlide]);

  const handleEmbedDialogOpenChange = useCallback((open: boolean) => {
    setEmbedDialogOpen(open);
    if (!open) {
      resetEmbedDialog();
    }
  }, [resetEmbedDialog]);

  const handleSubmitEmbed = useCallback((config: ActivityEmbedConfig) => {
    if (!presentation) return;

    if (embedDialogMode === "edit" && currentSlide?.engine === "embed") {
      updateSlide(presentationId, presentation.currentSlideIndex, config);
    } else {
      addEmbedSlide(presentationId, config);
    }

    setEmbedDialogOpen(false);
    resetEmbedDialog();
  }, [
    addEmbedSlide,
    currentSlide,
    embedDialogMode,
    presentation,
    presentationId,
    resetEmbedDialog,
    updateSlide,
  ]);

  const openSlideMcqDialog = useCallback(() => {
    setSlideMcqDialogOpen(true);
  }, []);

  const handleLaunchSlideMcq = useCallback(async () => {
    if (!presentation || !currentSlide?.slideQuestionDraft) return;
    if (!hasConvex) {
      toast.error("Set NEXT_PUBLIC_CONVEX_URL to launch activities.");
      return;
    }
    if (!hostToken) {
      toast.error("Host session is required to launch this question.");
      return;
    }

    try {
      await createHostedQuestion({
        presentationId,
        hostToken,
        questionType: "mcq",
        prompt: currentSlide.slideQuestionDraft.prompt,
        options: currentSlide.slideQuestionDraft.options,
        correctIndex:
          currentSlide.slideQuestionDraft.correctIndex ?? undefined,
        clientRequestId: nanoid(),
      });
      toast.success("Slide question launched as an activity.");
    } catch (error) {
      console.error("Failed to launch slide MCQ", error);
      toast.error("Could not launch this slide question.");
    }
  }, [
    createHostedQuestion,
    currentSlide,
    hasConvex,
    hostToken,
    presentation,
    presentationId,
  ]);

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

      if (currentSlide.engine === "embed") {
        const embedNode = visibleEmbedRef.current;
        if (!embedNode) return;
        const capture = await captureElementAsPng(embedNode);
        const blob = await fetch(capture.dataUrl).then((response) => response.blob());
        const rounded = await roundedBlob(blob);
        downloadBlob(rounded, fileName);
        return;
      }

      if (currentSlide.engine === "tldraw") {
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

  const createBlankPngBlob = useCallback(async (): Promise<Blob> => {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 900;
    const context = canvas.getContext("2d");
    if (!context) {
      return new Blob([], { type: "image/png" });
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob ?? new Blob([], { type: "image/png" })), "image/png", 1);
    });
  }, []);

  const blobToDataUrl = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") {
          reject(new Error("Failed to read image data URL."));
          return;
        }
        resolve(reader.result);
      };
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read blob."));
      reader.readAsDataURL(blob);
    });
  }, []);

  const inlineExcalidrawFilesForExport = useCallback(async (files: BinaryFiles): Promise<BinaryFiles> => {
    const entries = Object.entries(files);
    if (entries.length === 0) {
      return files;
    }

    const nextEntries = await Promise.all(
      entries.map(async ([fileId, value]) => {
        if (!value || typeof value !== "object") {
          return [fileId, value] as const;
        }

        const fileRecord = value as {
          dataURL?: string;
          mimeType?: string;
        };
        const dataURL = fileRecord.dataURL;

        if (!dataURL || typeof dataURL !== "string" || dataURL.startsWith("data:")) {
          return [fileId, value] as const;
        }

        try {
          const response = await fetch(dataURL);
          if (!response.ok) {
            throw new Error(`Asset request failed with ${response.status}.`);
          }

          const blob = await response.blob();
          const inlinedDataUrl = await blobToDataUrl(blob);
          return [
            fileId,
            {
              ...fileRecord,
              dataURL: inlinedDataUrl,
              mimeType: fileRecord.mimeType ?? blob.type,
            },
          ] as const;
        } catch (error) {
          console.warn("Failed to inline Excalidraw asset for export", {
            fileId,
            dataURL,
            error,
          });
          return [fileId, value] as const;
        }
      }),
    );

    return Object.fromEntries(nextEntries) as BinaryFiles;
  }, [blobToDataUrl]);

  const getBlobDimensions = useCallback(async (blob: Blob): Promise<{ width: number; height: number }> => {
    const bitmap = await createImageBitmap(blob);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  }, []);

  const captureMountedSlidePng = useCallback(
    async (slide: SlideData, scope: "visible" | "pdf"): Promise<Blob> => {
      if (slide.engine === "embed") {
        const node = scope === "pdf" ? pdfEmbedRef.current : visibleEmbedRef.current;
        if (!node) {
          throw new Error("Embed slide is unavailable.");
        }
        const capture = await captureElementAsPng(node);
        return fetch(capture.dataUrl).then((response) => response.blob());
      }

      if (slide.engine === "tldraw") {
        const editor = scope === "pdf" ? pdfTldrawEditorRef.current : tldrawEditorRef.current;
        if (!editor) {
          throw new Error("Tldraw editor is unavailable.");
        }

        const shapeIds = [...editor.getCurrentPageShapeIds()];
        if (shapeIds.length === 0) {
          return createBlankPngBlob();
        }

        const image = await editor.toImage(shapeIds, {
          format: "png",
          background: true,
          padding: 48,
          pixelRatio: 2,
        });

        return image.blob;
      }

      const api = scope === "pdf" ? pdfExcalidrawApiRef.current : excalidrawApiRef.current;
      if (!api) {
        throw new Error("Excalidraw API is unavailable.");
      }

      const elements = api.getSceneElements();
      if (elements.length === 0) {
        return createBlankPngBlob();
      }

      const appState = api.getAppState();
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const exportFiles = await inlineExcalidrawFilesForExport(api.getFiles());
      return exportToBlob({
        elements,
        appState: {
          ...appState,
          exportBackground: true,
          viewBackgroundColor: appState.viewBackgroundColor ?? "#ffffff",
        },
        files: exportFiles,
        mimeType: "image/png",
        exportPadding: 48,
      });
    },
    [createBlankPngBlob, inlineExcalidrawFilesForExport],
  );

  const isSlideLikelyBlank = useCallback((slide: SlideData): boolean => {
    if (slide.engine === "embed") return false;
    if (slide.engine === "excalidraw") {
      return slide.elements.length === 0;
    }
    return !slide.snapshot;
  }, []);

  const blobToOpenRouterImageUrl = useCallback(async (blob: Blob): Promise<string> => {
    return blobToDataUrl(blob);
  }, [blobToDataUrl]);

  const buildSlideVisionMessages = useCallback((
    task: SlideVisionTask,
    imageUrl: string,
  ): OpenRouterMessage[] => {
    const wantsMermaid = presentation?.canvasEngine === "excalidraw" &&
      (task === "solve_slide" || task === "clean_notes");
    const mermaidAppendix = wantsMermaid
      ? " Because this lesson uses Excalidraw, append a final ```mermaid``` code block that is valid Mermaid and safe to import into Excalidraw. Use `flowchart TD` unless another Mermaid diagram type is clearly better. Every node must use quoted labels like `A[\"...\"]` or `B{\"...\"}`. Keep all punctuation, equations, parentheses, and explanatory text inside the quoted label text only. Never place raw text after a node id. Never use LaTeX in Mermaid. Use short labels, and use `<br/>` for line breaks inside labels when needed."
      : "";
    const systemPromptByTask: Record<SlideVisionTask, string> = {
      summarize_slide:
        "You are SlideBoard Assistant in slide-summary mode. Analyze the provided slide image and return a concise teacher-friendly Markdown summary. Include the main concept, key details, and any visible prompts or tasks. Mention uncertainty briefly if text is unclear.",
      solve_slide:
        "You are SlideBoard Assistant in slide-solution mode. Analyze the provided slide image and solve or explain the visible problem in clean Markdown. Show a worked solution when appropriate. If the image is partially unclear, note that briefly and give the best-effort explanation." +
        mermaidAppendix,
      clean_notes:
        "You are SlideBoard Assistant in notes-cleanup mode. Analyze the provided slide image and rewrite the visible notes into clear, polished Markdown. Fix noisy phrasing, OCR-like mistakes, duplication, and inconsistent formatting while preserving correctness." +
        mermaidAppendix,
    };

    const userPromptByTask: Record<SlideVisionTask, string> = {
      summarize_slide: "Summarize this slide for a teacher preparing to present it.",
      solve_slide: "Solve or clearly explain the problem or concept shown on this slide.",
      clean_notes: "Clean up the notes shown on this slide and turn them into well-structured notes.",
    };

    const userContent: ChatMessageContentPart[] = [
      {
        type: "text",
        text: userPromptByTask[task],
      },
      {
        type: "image_url",
        image_url: { url: imageUrl },
      },
    ];

    return [
      {
        role: "system",
        content:
          "You are SlideBoard Assistant for educators. Keep answers concise, practical, and classroom-friendly. Format every response in clean Markdown with short sections and bullet points when useful. For math, use strict LaTeX delimiters only: inline `$...$` and display `$$...$$`.",
      },
      {
        role: "system",
        content: systemPromptByTask[task],
      },
      {
        role: "user",
        content: userContent,
      },
    ];
  }, [presentation?.canvasEngine]);

  const captureCurrentSlideForAssistant = useCallback(async (): Promise<{
    blob: Blob;
    imageUrl: string;
  }> => {
    if (!currentSlide) {
      throw new Error("No slide is available.");
    }

    if (currentSlide.engine === "tldraw") {
      const editor = tldrawEditorRef.current;
      if (!editor || editor.getCurrentPageShapeIds().size === 0) {
        throw new Error("This slide is blank.");
      }
    }

    if (currentSlide.engine === "excalidraw") {
      const api = excalidrawApiRef.current;
      if (!api || api.getSceneElements().length === 0) {
        throw new Error("This slide is blank.");
      }
    }

    const blob = await captureMountedSlidePng(currentSlide, "visible");
    return {
      blob,
      imageUrl: await blobToOpenRouterImageUrl(blob),
    };
  }, [blobToOpenRouterImageUrl, captureMountedSlidePng, currentSlide]);

  const runCurrentSlideVisionTask = useCallback(async (task: SlideVisionTask): Promise<string> => {
    const { imageUrl } = await captureCurrentSlideForAssistant();
    const messages = buildSlideVisionMessages(task, imageUrl);
    return sendChatMessage(messages);
  }, [buildSlideVisionMessages, captureCurrentSlideForAssistant]);

  const waitForPdfRenderCanvas = useCallback(
    async (slide: SlideData, timeoutMs = 6000) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (
          slide.engine === "tldraw" &&
          pdfTldrawEditorRef.current &&
          pdfTldrawReadySlideIdRef.current === slide.id
        ) {
          return;
        }
        if (
          slide.engine === "excalidraw" &&
          pdfExcalidrawApiRef.current &&
          pdfExcalidrawReadySlideIdRef.current === slide.id
        ) {
          return;
        }
        if (slide.engine === "embed" && pdfEmbedRef.current) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
      throw new Error("Hidden renderer did not become ready in time.");
    },
    [],
  );

  const generateLessonDocs = useCallback(async (onChunk: (chunk: string) => void): Promise<string> => {
    if (!presentation) {
      throw new Error("Presentation not found.");
    }

    const extractionBatches: string[] = [];
    const batchSize = 4;
    const candidateSlides = presentation.slides
      .map((slide, index) => ({ slide, index }))
      .filter(({ slide }) => !isSlideLikelyBlank(slide));

    if (candidateSlides.length === 0) {
      throw new Error("There are no non-empty slides to analyze.");
    }

    try {
      for (let start = 0; start < candidateSlides.length; start += batchSize) {
        const batch = candidateSlides.slice(start, start + batchSize);
        const batchMessages: OpenRouterMessage[] = [
          {
            role: "system",
            content:
              "You are SlideBoard Assistant extracting lesson notes from slide images. For each slide, produce clean Markdown notes with: title/topic, key ideas, visible examples/problems, important vocabulary or formulas, and any uncertainty caused by unclear text.",
          },
        ];

        const batchContent: ChatMessageContentPart[] = [
          {
            type: "text",
            text:
              "Extract normalized notes from these slides. Return Markdown grouped by slide number. Do not write the final handout yet.",
          },
        ];

        for (const { slide, index } of batch) {
          setPdfRenderSlideIndex(index);
          await waitForPdfRenderCanvas(slide);
          const blob = await captureMountedSlidePng(slide, "pdf");
          const imageUrl = await blobToOpenRouterImageUrl(blob);
          batchContent.push({
            type: "text",
            text: `Slide ${index + 1}`,
          });
          batchContent.push({
            type: "image_url",
            image_url: { url: imageUrl },
          });
        }

        batchMessages.push({
          role: "user",
          content: batchContent,
        });

        const batchResult = await sendChatMessage(batchMessages);
        extractionBatches.push(batchResult.trim());
      }
    } finally {
      setPdfRenderSlideIndex(null);
    }

    const synthesisMessages: OpenRouterMessage[] = [
      {
        role: "system",
        content:
          "You are SlideBoard Assistant in lesson-document mode. Turn extracted slide notes into polished Markdown. Preserve correctness, fix messy wording, remove duplication, and improve structure.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Create two polished Markdown documents from these extracted slide notes.\n\nDocument 1: Teacher lesson notes with lesson objective, cleaned explanations, worked examples, teaching flow, misconceptions, and checks for understanding.\n\nDocument 2: Student handout with simplified explanations, cleaned examples, and practice-ready structure. Remove teacher-only commentary.\n\nReturn both documents in one response with top-level headings `# Teacher Lesson Notes` and `# Student Handout`.\n\nExtracted notes:\n\n" +
              extractionBatches.join("\n\n---\n\n"),
          },
        ],
      },
    ];

    return sendChatMessage(synthesisMessages, onChunk);
  }, [
    blobToOpenRouterImageUrl,
    captureMountedSlidePng,
    isSlideLikelyBlank,
    presentation,
    waitForPdfRenderCanvas,
  ]);

  const handleExportDeckPdf = useCallback(async () => {
    if (!presentation || isExportingDeckPdf) return;

    setIsExportingDeckPdf(true);
    setPdfDialogOpen(false);

    try {
      const slideBlobs: Blob[] = [];

      for (let i = 0; i < presentation.slides.length; i++) {
        const targetSlide = presentation.slides[i];
        if (!targetSlide) continue;

        try {
          setPdfRenderSlideIndex(i);
          await waitForPdfRenderCanvas(targetSlide);
          const blob = await captureMountedSlidePng(targetSlide, "pdf");
          slideBlobs.push(blob);
        } catch (error) {
          console.error(`Failed to export slide ${i + 1}`, error);
          throw new Error(`Could not export slide ${i + 1}. This slide may include a cross-origin asset that blocks PDF export.`);
        }
      }

      if (slideBlobs.length === 0) {
        return;
      }

      const firstDimensions = await getBlobDimensions(slideBlobs[0]);
      const firstRatio =
        firstDimensions.height > 0
          ? firstDimensions.width / firstDimensions.height
          : 16 / 9;

      const fitWidth = 1024;
      const fitHeight = Math.max(576, Math.round(fitWidth / firstRatio));

      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: pdfExportFormat === "a4" ? "a4" : [fitWidth, fitHeight],
      });

      for (let i = 0; i < slideBlobs.length; i++) {
        if (i > 0) {
          pdf.addPage(
            pdfExportFormat === "a4" ? "a4" : [fitWidth, fitHeight],
            "landscape",
          );
        }

        const blob = slideBlobs[i];
        const [dimensions, dataUrl] = await Promise.all([
          getBlobDimensions(blob),
          blobToDataUrl(blob),
        ]);

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const scale = Math.min(pageWidth / dimensions.width, pageHeight / dimensions.height);
        const renderWidth = dimensions.width * scale;
        const renderHeight = dimensions.height * scale;
        const x = (pageWidth - renderWidth) / 2;
        const y = (pageHeight - renderHeight) / 2;

        pdf.addImage(dataUrl, "PNG", x, y, renderWidth, renderHeight, undefined, "FAST");
      }

      const fileName = `${presentation.name.replace(/[^a-z0-9]/gi, "_")}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("Failed to export deck PDF", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not export this deck as PDF.",
      );
    } finally {
      setPdfRenderSlideIndex(null);
      setIsExportingDeckPdf(false);
    }
  }, [
    blobToDataUrl,
    captureMountedSlidePng,
    getBlobDimensions,
    isExportingDeckPdf,
    pdfExportFormat,
    presentation,
    waitForPdfRenderCanvas,
  ]);

  const handlePdfMenuSelect = useCallback((event: Event) => {
    event.preventDefault();
    shouldOpenPdfDialogRef.current = true;
    setExportMenuOpen(false);
  }, []);

  const handleExportMenuOpenChange = useCallback((open: boolean) => {
    setExportMenuOpen(open);

    if (!open && shouldOpenPdfDialogRef.current) {
      shouldOpenPdfDialogRef.current = false;
      requestAnimationFrame(() => {
        setPdfDialogOpen(true);
      });
    }
  }, []);

  const waitForCanvasReady = useCallback(
    async (engine: "tldraw" | "excalidraw", timeoutMs = 2500) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (engine === "tldraw" && tldrawEditorRef.current) {
          return;
        }
        if (engine === "excalidraw" && excalidrawApiRef.current) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
      throw new Error("Canvas is not ready yet.");
    },
    [],
  );

  const waitForNextPaint = useCallback(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }, []);

  const upsertSlideMcqImage = useCallback(
    async (draft: SlideMcqDraft) => {
      if (!presentation || !currentSlide || currentSlide.engine === "embed") {
        throw new Error("Slide questions can only be added to whiteboard slides.");
      }

      setMcqCaptureDraft(draft);
      await waitForNextPaint();

      const sourceElement = mcqCaptureRef.current;
      if (!sourceElement) {
        throw new Error("Question preview is unavailable.");
      }

      const capture = await captureElementAsPng(sourceElement);
      const { dataUrl, width, height } = capture;

      if (presentation.canvasEngine === "tldraw") {
        const editor = tldrawEditorRef.current;
        if (!editor) {
          throw new Error("Tldraw editor is unavailable.");
        }

        const existingAsset = currentSlide.slideQuestionAsset;
        if (existingAsset?.engine === "tldraw" && existingAsset.shapeId) {
          editor.deleteShapes([existingAsset.shapeId as never]);
        }

        const viewport = editor.getViewportPageBounds();
        const maxWidth = viewport.w * 0.4;
        const maxHeight = viewport.h * 0.46;
        const scale = Math.min(maxWidth / width, maxHeight / height, 1);
        const renderWidth = Math.max(1, Math.round(width * scale));
        const renderHeight = Math.max(1, Math.round(height * scale));
        const x = viewport.x + viewport.w - renderWidth - 40;
        const y = viewport.y + viewport.h - renderHeight - 40;

        const assetId = `asset:${nanoid()}`;
        const shapeId = `shape:${nanoid()}`;

        editor.createAssets([
          {
            id: assetId,
            typeName: "asset",
            type: "image",
            props: {
              name: `slide-mcq-${currentSlide.id}.png`,
              src: dataUrl,
              w: width,
              h: height,
              mimeType: "image/png",
              isAnimated: false,
            },
            meta: {},
          } as never,
        ]);

        editor.createShapes([
          {
            id: shapeId,
            type: "image",
            parentId: editor.getCurrentPageId(),
            x,
            y,
            props: {
              w: renderWidth,
              h: renderHeight,
              assetId,
              playing: true,
              url: "",
              crop: null,
              flipX: false,
              flipY: false,
              altText: "Slide question",
            },
          } as never,
        ]);

        const nextSnapshot = getSnapshot(editor.store);
        updateSlide(presentationId, presentation.currentSlideIndex, {
          snapshot: nextSnapshot.document,
          slideQuestionDraft: draft,
          slideQuestionAsset: {
            engine: "tldraw",
            shapeId,
            assetId,
          },
        });

        return;
      }

      const api = excalidrawApiRef.current;
      if (!api) {
        throw new Error("Excalidraw API is unavailable.");
      }

      const existingAsset = currentSlide.slideQuestionAsset;
      const filteredElements =
        existingAsset?.engine === "excalidraw" && existingAsset.elementId
          ? api.getSceneElements().filter((element) => element.id !== existingAsset.elementId)
          : api.getSceneElements();
      const { elements: normalizedExistingElements } =
        sanitizeExcalidrawElementIndices(filteredElements);

      const currentAppState = api.getAppState();
      const zoomValue =
        typeof (currentAppState.zoom as { value?: number } | undefined)?.value ===
          "number" &&
        (currentAppState.zoom as { value: number }).value > 0
          ? (currentAppState.zoom as { value: number }).value
          : 1;
      const viewportWidth =
        typeof currentAppState.width === "number" ? currentAppState.width : 1280;
      const viewportHeight =
        typeof currentAppState.height === "number" ? currentAppState.height : 720;
      const scrollX =
        typeof currentAppState.scrollX === "number" ? currentAppState.scrollX : 0;
      const scrollY =
        typeof currentAppState.scrollY === "number" ? currentAppState.scrollY : 0;

      const visibleWidth = viewportWidth / zoomValue;
      const visibleHeight = viewportHeight / zoomValue;
      const maxWidth = visibleWidth * 0.4;
      const maxHeight = visibleHeight * 0.46;
      const scale = Math.min(maxWidth / width, maxHeight / height, 1);
      const renderWidth = Math.max(1, Math.round(width * scale));
      const renderHeight = Math.max(1, Math.round(height * scale));
      const x = Math.round(-scrollX + visibleWidth - renderWidth - 40);
      const y = Math.round(-scrollY + visibleHeight - renderHeight - 40);

      const fileId = nanoid();
      const elementId = nanoid();
      const now = Date.now();
      const fileRecord = {
        id: fileId,
        dataURL: dataUrl,
        mimeType: "image/png",
        created: now,
      };

      const imageElement: ExcalidrawElement = {
        type: "image",
        version: 1,
        versionNonce: Math.floor(Math.random() * 2147483647),
        index: getNextValidExcalidrawIndex(normalizedExistingElements),
        isDeleted: false,
        id: elementId,
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        angle: 0,
        x,
        y,
        strokeColor: "transparent",
        backgroundColor: "transparent",
        width: renderWidth,
        height: renderHeight,
        seed: Math.floor(Math.random() * 2147483647),
        groupIds: [],
        frameId: null,
        boundElements: null,
        updated: now,
        link: null,
        locked: false,
        roundness: null,
        fileId,
        status: "saved",
        scale: [1, 1],
        crop: null,
      };

      const nextElements = [...normalizedExistingElements, imageElement];
      api.addFiles?.([fileRecord]);
      api.updateScene?.({
        elements: nextElements,
        commitToHistory: true,
      });

      const existingFiles = api.getFiles() as Record<string, unknown>;
      const nextFiles = { ...existingFiles } as BinaryFiles;
      if (existingAsset?.engine === "excalidraw" && existingAsset.fileId) {
        delete nextFiles[existingAsset.fileId];
      }
      nextFiles[fileId] = fileRecord;

      updateSlide(presentationId, presentation.currentSlideIndex, {
        elements: nextElements,
        appState: {
          scrollX:
            typeof currentAppState.scrollX === "number"
              ? currentAppState.scrollX
              : 0,
          scrollY:
            typeof currentAppState.scrollY === "number"
              ? currentAppState.scrollY
              : 0,
          zoom: currentAppState.zoom,
          viewBackgroundColor:
            typeof currentAppState.viewBackgroundColor === "string"
              ? currentAppState.viewBackgroundColor
              : "#ffffff",
          currentItemStrokeWidth:
            typeof currentAppState.currentItemStrokeWidth === "number"
              ? currentAppState.currentItemStrokeWidth
              : 1,
        },
        files: nextFiles,
        slideQuestionDraft: draft,
        slideQuestionAsset: {
          engine: "excalidraw",
          elementId,
          fileId,
        },
      });
    },
    [currentSlide, presentation, presentationId, updateSlide, waitForNextPaint],
  );

  const insertAssistantMermaid = useCallback(async (mermaidCode: string) => {
    if (!presentation || !currentSlide || currentSlide.engine !== "excalidraw") {
      throw new Error("Mermaid insertion is only available on Excalidraw slides.");
    }

    const api = excalidrawApiRef.current;
    if (!api) {
      throw new Error("Excalidraw is unavailable.");
    }

    const [{ parseMermaidToExcalidraw }, { convertToExcalidrawElements, restoreElements }] = await Promise.all([
      import("@excalidraw/mermaid-to-excalidraw"),
      import("@excalidraw/excalidraw"),
    ]);

    const parsed = await parseMermaidToExcalidraw(mermaidCode);
    const importedElements = convertToExcalidrawElements(parsed.elements, {
      regenerateIds: true,
    }) as ExcalidrawElement[];

    if (importedElements.length === 0) {
      throw new Error("No Mermaid diagram could be generated.");
    }

    const numericBounds = importedElements.reduce<{
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    }>((acc, element) => {
        const x = typeof element.x === "number" ? element.x : 0;
        const y = typeof element.y === "number" ? element.y : 0;
        const width = typeof element.width === "number" ? element.width : 0;
        const height = typeof element.height === "number" ? element.height : 0;
        return {
          minX: Math.min(acc.minX, x),
          minY: Math.min(acc.minY, y),
          maxX: Math.max(acc.maxX, x + width),
          maxY: Math.max(acc.maxY, y + height),
        };
      },
      {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
      },
    );

    const currentAppState = api.getAppState();
    const zoomValue =
      typeof (currentAppState.zoom as { value?: number } | undefined)?.value === "number" &&
      (currentAppState.zoom as { value: number }).value > 0
        ? (currentAppState.zoom as { value: number }).value
        : 1;
    const viewportWidth =
      typeof currentAppState.width === "number" ? currentAppState.width : 1280;
    const viewportHeight =
      typeof currentAppState.height === "number" ? currentAppState.height : 720;
    const scrollX =
      typeof currentAppState.scrollX === "number" ? currentAppState.scrollX : 0;
    const scrollY =
      typeof currentAppState.scrollY === "number" ? currentAppState.scrollY : 0;

    const visibleWidth = viewportWidth / zoomValue;
    const visibleHeight = viewportHeight / zoomValue;
    const diagramWidth = numericBounds.maxX - numericBounds.minX;
    const diagramHeight = numericBounds.maxY - numericBounds.minY;
    const targetCenterX = -scrollX + visibleWidth / 2;
    const targetCenterY = -scrollY + visibleHeight / 2;
    const currentCenterX = numericBounds.minX + diagramWidth / 2;
    const currentCenterY = numericBounds.minY + diagramHeight / 2;
    const offsetX = targetCenterX - currentCenterX;
    const offsetY = targetCenterY - currentCenterY;

    const shiftedElements = importedElements.map((element) => ({
      ...element,
      x: typeof element.x === "number" ? element.x + offsetX : element.x,
      y: typeof element.y === "number" ? element.y + offsetY : element.y,
    }));

    const existingElements = api.getSceneElements();
    const normalizedImportedElements = restoreElements(
      shiftedElements as never,
      existingElements as never,
      {
        refreshDimensions: true,
        repairBindings: true,
      },
    ) as ExcalidrawElement[];
    const parsedFiles = (parsed.files ?? {}) as BinaryFiles;
    const nextFiles = {
      ...(api.getFiles() as BinaryFiles),
      ...parsedFiles,
    };
    const { elements: normalizedElements } = sanitizeExcalidrawElementIndices([
      ...existingElements,
      ...normalizedImportedElements,
    ]);

    const fileRecords = Object.values(
      parsedFiles as Record<string, { id: string; dataURL: string; mimeType: string; created: number }>,
    );
    if (fileRecords.length > 0) {
      api.addFiles?.(fileRecords);
    }
    api.updateScene?.({
      elements: normalizedElements,
      files: nextFiles,
      commitToHistory: true,
    });

    updateSlide(presentationId, presentation.currentSlideIndex, {
      elements: normalizedElements,
      appState: currentAppState,
      files: nextFiles,
    });
  }, [currentSlide, presentation, presentationId, updateSlide]);

  const handleSaveSlideMcq = useCallback(async (draft: SlideMcqDraft) => {
    if (!presentation || !currentSlide) return;
    if (currentSlide.engine === "embed") {
      toast.error("Slide questions can only be added to whiteboard slides.");
      return;
    }

    try {
      await upsertSlideMcqImage(draft);
      setSlideMcqDialogOpen(false);
    } catch (error) {
      console.error("Failed to insert slide MCQ", error);
      toast.error("Could not place this question on the slide.");
    } finally {
      setMcqCaptureDraft(null);
    }
  }, [currentSlide, presentation, upsertSlideMcqImage]);

  const handleClearSlideMcq = useCallback(() => {
    if (!presentation || !currentSlide) return;
    if (currentSlide.engine === "tldraw") {
      const editor = tldrawEditorRef.current;
      const shapeId =
        currentSlide.slideQuestionAsset?.engine === "tldraw"
          ? currentSlide.slideQuestionAsset.shapeId
          : undefined;

      if (editor && shapeId) {
        editor.deleteShapes([shapeId as never]);
        const nextSnapshot = getSnapshot(editor.store);
        updateSlide(presentationId, presentation.currentSlideIndex, {
          snapshot: nextSnapshot.document,
          slideQuestionDraft: undefined,
          slideQuestionAsset: undefined,
        });
      } else {
        updateSlide(presentationId, presentation.currentSlideIndex, {
          slideQuestionDraft: undefined,
          slideQuestionAsset: undefined,
        });
      }
    } else if (currentSlide.engine === "excalidraw") {
      const api = excalidrawApiRef.current;
      const asset =
        currentSlide.slideQuestionAsset?.engine === "excalidraw"
          ? currentSlide.slideQuestionAsset
          : undefined;

      if (api && asset?.elementId) {
        const nextElements = api
          .getSceneElements()
          .filter((element) => element.id !== asset.elementId);
        const nextFiles = { ...(api.getFiles() as BinaryFiles) };
        if (asset.fileId) {
          delete nextFiles[asset.fileId];
        }
        api.updateScene?.({
          elements: nextElements,
          commitToHistory: true,
        });
        updateSlide(presentationId, presentation.currentSlideIndex, {
          elements: nextElements,
          appState: api.getAppState(),
          files: nextFiles,
          slideQuestionDraft: undefined,
          slideQuestionAsset: undefined,
        });
      } else {
        updateSlide(presentationId, presentation.currentSlideIndex, {
          slideQuestionDraft: undefined,
          slideQuestionAsset: undefined,
        });
      }
    } else {
      updateSlide(presentationId, presentation.currentSlideIndex, {
        slideQuestionDraft: undefined,
        slideQuestionAsset: undefined,
      });
    }

    setMcqCaptureDraft(null);
    setSlideMcqDialogOpen(false);
  }, [currentSlide, presentation, presentationId, updateSlide]);

  const insertAssistantImage = useCallback(
    async ({ dataUrl, width, height, target, messageId }: AssistantInsertPayload) => {
      const snapshotBeforeInsert = usePresentationStore
        .getState()
        .presentations.find((p) => p.id === presentationId);

      if (!snapshotBeforeInsert) {
        throw new Error("Presentation not found.");
      }

      if (target === "new") {
        tldrawEditorRef.current = null;
        excalidrawApiRef.current = null;
        addSlide(presentationId);
      }

      const livePresentation = usePresentationStore
        .getState()
        .presentations.find((p) => p.id === presentationId);

      if (!livePresentation) {
        throw new Error("Presentation not found.");
      }

      await waitForCanvasReady(livePresentation.canvasEngine);

      if (livePresentation.canvasEngine === "tldraw") {
        const editor = tldrawEditorRef.current;
        if (!editor) {
          throw new Error("Tldraw editor is unavailable.");
        }

        const viewport = editor.getViewportPageBounds();
        const maxWidth = viewport.w * 0.72;
        const maxHeight = viewport.h * 0.72;
        const scale = Math.min(maxWidth / width, maxHeight / height, 1);
        const renderWidth = Math.max(1, Math.round(width * scale));
        const renderHeight = Math.max(1, Math.round(height * scale));
        const x = viewport.x + (viewport.w - renderWidth) / 2;
        const y = viewport.y + (viewport.h - renderHeight) / 2;

        const assetId = `asset:${nanoid()}`;
        const shapeId = `shape:${nanoid()}`;

        editor.createAssets([
          {
            id: assetId,
            typeName: "asset",
            type: "image",
            props: {
              name: `assistant-${messageId}.png`,
              src: dataUrl,
              w: width,
              h: height,
              mimeType: "image/png",
              isAnimated: false,
            },
            meta: {},
          } as never,
        ]);

        editor.createShapes([
          {
            id: shapeId,
            type: "image",
            parentId: editor.getCurrentPageId(),
            x,
            y,
            props: {
              w: renderWidth,
              h: renderHeight,
              assetId,
              playing: true,
              url: "",
              crop: null,
              flipX: false,
              flipY: false,
              altText: "Assistant response",
            },
          } as never,
        ]);

        const nextSnapshot = getSnapshot(editor.store);
        const currentIndex = usePresentationStore
          .getState()
          .presentations.find((p) => p.id === presentationId)
          ?.currentSlideIndex;

        if (typeof currentIndex === "number") {
          updateSlide(presentationId, currentIndex, {
            snapshot: nextSnapshot.document,
          });
        }

        return;
      }

      const api = excalidrawApiRef.current;
      if (!api) {
        throw new Error("Excalidraw API is unavailable.");
      }

      const currentAppState = api.getAppState();
      const zoomValue =
        typeof (currentAppState.zoom as { value?: number } | undefined)?.value ===
          "number" &&
        (currentAppState.zoom as { value: number }).value > 0
          ? (currentAppState.zoom as { value: number }).value
          : 1;
      const viewportWidth =
        typeof currentAppState.width === "number" ? currentAppState.width : 1280;
      const viewportHeight =
        typeof currentAppState.height === "number" ? currentAppState.height : 720;
      const scrollX =
        typeof currentAppState.scrollX === "number" ? currentAppState.scrollX : 0;
      const scrollY =
        typeof currentAppState.scrollY === "number" ? currentAppState.scrollY : 0;

      const visibleWidth = viewportWidth / zoomValue;
      const visibleHeight = viewportHeight / zoomValue;
      const maxWidth = visibleWidth * 0.72;
      const maxHeight = visibleHeight * 0.72;
      const scale = Math.min(maxWidth / width, maxHeight / height, 1);
      const renderWidth = Math.max(1, Math.round(width * scale));
      const renderHeight = Math.max(1, Math.round(height * scale));

      const centerX = -scrollX + visibleWidth / 2;
      const centerY = -scrollY + visibleHeight / 2;
      const x = Math.round(centerX - renderWidth / 2);
      const y = Math.round(centerY - renderHeight / 2);

      const fileId = nanoid();
      const now = Date.now();
      const fileRecord = {
        id: fileId,
        dataURL: dataUrl,
        mimeType: "image/png",
        created: now,
      };

      const existingElements = api.getSceneElements();
      const { elements: normalizedExistingElements } =
        sanitizeExcalidrawElementIndices(existingElements);

      const imageElement: ExcalidrawElement = {
        type: "image",
        version: 1,
        versionNonce: Math.floor(Math.random() * 2147483647),
        index: getNextValidExcalidrawIndex(normalizedExistingElements),
        isDeleted: false,
        id: nanoid(),
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        angle: 0,
        x,
        y,
        strokeColor: "transparent",
        backgroundColor: "transparent",
        width: renderWidth,
        height: renderHeight,
        seed: Math.floor(Math.random() * 2147483647),
        groupIds: [],
        frameId: null,
        boundElements: null,
        updated: now,
        link: null,
        locked: false,
        roundness: null,
        fileId,
        status: "saved",
        scale: [1, 1],
        crop: null,
      };

      const nextElements = [...normalizedExistingElements, imageElement];

      api.addFiles?.([fileRecord]);
      api.updateScene?.({
        elements: nextElements,
        commitToHistory: true,
      });

      const existingFiles = api.getFiles() as Record<string, unknown>;
      const nextFiles = {
        ...existingFiles,
        [fileId]: fileRecord,
      } as BinaryFiles;

      const currentIndex = usePresentationStore
        .getState()
        .presentations.find((p) => p.id === presentationId)
        ?.currentSlideIndex;

      if (typeof currentIndex === "number") {
        updateSlide(presentationId, currentIndex, {
          elements: nextElements,
          appState: {
            scrollX:
              typeof currentAppState.scrollX === "number"
                ? currentAppState.scrollX
                : 0,
            scrollY:
              typeof currentAppState.scrollY === "number"
                ? currentAppState.scrollY
                : 0,
            zoom: currentAppState.zoom,
            viewBackgroundColor:
              typeof currentAppState.viewBackgroundColor === "string"
                ? currentAppState.viewBackgroundColor
                : "#ffffff",
            currentItemStrokeWidth:
              typeof currentAppState.currentItemStrokeWidth === "number"
                ? currentAppState.currentItemStrokeWidth
                : 1,
          },
          files: nextFiles,
        });
      }
    },
    [addSlide, presentationId, updateSlide, waitForCanvasReady],
  );

  const toggleRightPanelTab = useCallback(
    (targetTab: Exclude<RightPanelTab, null>) => {
      setRightPanelTab((tab) => {
        const nextTab = tab === targetTab ? null : targetTab;
        if (
          nextTab &&
          calculatorOpenRef.current &&
          calculatorModeRef.current === "sheet"
        ) {
          setCalculatorOpen(false);
        }
        return nextTab;
      });
    },
    [],
  );

  const toggleAssistant = useCallback(() => {
    toggleRightPanelTab("assistant");
  }, [toggleRightPanelTab]);

  const toggleCalculator = useCallback(() => {
    setCalculatorOpen((open) => {
      const nextOpen = !open;
      if (nextOpen && calculatorModeRef.current === "sheet") {
        setRightPanelTab(null);
      }
      return nextOpen;
    });
  }, []);

  useEffect(() => {
    calculatorModeRef.current = calculatorMode;
    calculatorOpenRef.current = calculatorOpen;
    rightPanelTabRef.current = rightPanelTab;
  }, [calculatorMode, calculatorOpen, rightPanelTab]);

  useEffect(() => {
    if (rightPanelTab) {
      localStorage.setItem("slideboard-right-panel-tab", rightPanelTab);
    } else {
      localStorage.removeItem("slideboard-right-panel-tab");
    }
  }, [rightPanelTab]);

  useEffect(() => {
    localStorage.setItem(`slideboard-calculator-open:${presentationId}`, calculatorOpen ? "1" : "0");
  }, [calculatorOpen, presentationId]);

  useEffect(() => {
    localStorage.setItem("slideboard-calculator-mode", calculatorMode);
  }, [calculatorMode]);

  useEffect(() => {
    localStorage.setItem("slideboard-pdf-export-format", pdfExportFormat);
  }, [pdfExportFormat]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isTypingTarget =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT");

      if (isTypingTarget) return;

      const hasNavigationModifier = event.metaKey || event.ctrlKey || event.altKey || event.shiftKey;
      if (!hasNavigationModifier) {
        switch (event.key) {
          case "ArrowLeft":
          case "ArrowUp":
            event.preventDefault();
            goToPreviousSlide(presentationId);
            return;
          case "ArrowRight":
          case "ArrowDown":
            event.preventDefault();
            goToNextSlide(presentationId);
            return;
        }
      }

      const hasModifier = event.metaKey || event.ctrlKey;
      if (!hasModifier || event.key.toLowerCase() !== "j") return;

      event.preventDefault();

      if (event.shiftKey) {
        toggleRightPanelTab("assistant");
        return;
      }

      if (event.altKey) return;
      addSlide(presentationId);
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [
    addSlide,
    goToNextSlide,
    goToPreviousSlide,
    presentationId,
    toggleRightPanelTab,
  ]);

  useEffect(() => {
    const canvasRegion = canvasRegionRef.current;
    if (!canvasRegion) return;

    const listenerOptions: AddEventListenerOptions = { passive: false, capture: true };

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
    window.addEventListener("gesturestart", handleGesture, listenerOptions);
    window.addEventListener("gesturechange", handleGesture, listenerOptions);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.documentElement.classList.remove("editor-gesture-lock");
      document.body.classList.remove("editor-gesture-lock");
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

        <div className="flex items-center gap-2 overflow-x-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => addSlide(presentationId)}>
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span className="mr-2">Add slide</span>
              <kbd className="rounded border border-background/35 bg-background/20 px-1.5 py-0.5 text-[10px] font-mono text-background">
                Ctrl + J
              </kbd>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={currentSlide?.engine === "embed" ? "outline" : "ghost"}
                size="icon"
                onClick={
                  currentSlide?.engine === "embed"
                    ? openEditEmbedDialog
                    : openCreateEmbedDialog
                }
              >
                <Frame className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {currentSlide?.engine === "embed" ? "Edit embed" : "Add embed"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={currentSlide?.slideQuestionDraft ? "outline" : "ghost"}
                size="icon"
                disabled={currentSlide?.engine === "embed"}
                onClick={openSlideMcqDialog}
              >
                <ClipboardList className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {currentSlide?.engine === "embed"
                ? "Slide MCQ is unavailable on embeds"
                : currentSlide?.slideQuestionDraft
                  ? "Edit slide MCQ"
                  : "Add slide MCQ"}
            </TooltipContent>
          </Tooltip>

          {currentSlide?.slideQuestionDraft ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleLaunchSlideMcq}
              disabled={!hasConvex || !hostToken}
            >
              <Rocket className="h-3.5 w-3.5" />
              Add as activity
            </Button>
          ) : null}

          <DropdownMenu open={exportMenuOpen} onOpenChange={handleExportMenuOpenChange}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Export</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleDownloadSlideImage}>
                <ImageDown className="h-4 w-4" />
                As picture of slide
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={handlePdfMenuSelect}
                disabled={isExportingDeckPdf}
              >
                <FileDown className="h-4 w-4" />
                {isExportingDeckPdf ? "Exporting PDF..." : "As PDF"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleExport}>
                <Download className="h-4 w-4" />
                As JSON export
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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

          <PresentationTimer presentationId={presentationId} />

          <AmbientMusicMenu key={presentationId} presentationId={presentationId} />

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant="outline"
            className="h-9 px-3 text-xs"
            onClick={toggleAssistant}
          >
            {rightPanelTab === "assistant" ? "Hide Assistant" : "Show Assistant"}
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={rightPanelTab === "activities" ? "default" : "ghost"}
                size="icon"
                disabled={!hasConvex}
                onClick={() =>
                  hasConvex && toggleRightPanelTab("activities")
                }
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {hasConvex ? "Activities" : "Activities (set NEXT_PUBLIC_CONVEX_URL)"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={rightPanelTab === "questions" ? "default" : "ghost"}
                size="icon"
                disabled={!hasConvex}
                onClick={() =>
                  hasConvex && toggleRightPanelTab("questions")
                }
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {hasConvex ? "Q&A" : "Q&A (set NEXT_PUBLIC_CONVEX_URL)"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShareDialogOpen(true)}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share</TooltipContent>
          </Tooltip>

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
                currentSlide.engine === "embed" ? (
                  <ActivityEmbedSlide
                    ref={visibleEmbedRef}
                    slide={currentSlide}
                    className="absolute inset-0"
                  />
                ) : presentation.canvasEngine === "excalidraw" ? (
                  <ExcalidrawWrapper
                    key={`${currentSlide.id}:${currentSlide.sceneVersion}`}
                    initialElements={currentSlide.engine === "excalidraw" ? currentSlide.elements : []}
                    initialAppState={currentSlide.engine === "excalidraw" ? currentSlide.appState : {}}
                    initialFiles={currentSlide.engine === "excalidraw" ? currentSlide.files : {}}
                    onChange={handleExcalidrawChange}
                    onReady={(api) => {
                      excalidrawApiRef.current = api as ExcalidrawApiLike;
                      excalidrawReadySlideIdRef.current = currentSlide.id;
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
                      tldrawReadySlideIdRef.current = currentSlide.id;
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
                        setRightPanelTab(null);
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
          ) : rightPanelTab === "assistant" ? (
            <div className="w-[360px] shrink-0 border-l border-border bg-background">
              <ChatPanel
                className="h-full"
                onSummarizeSlide={() => runCurrentSlideVisionTask("summarize_slide")}
                onSolveSlide={() => runCurrentSlideVisionTask("solve_slide")}
                onCleanSlideNotes={() => runCurrentSlideVisionTask("clean_notes")}
                onGenerateLessonDocs={generateLessonDocs}
                onInsertAsMermaid={
                  presentation.canvasEngine === "excalidraw"
                    ? insertAssistantMermaid
                    : undefined
                }
                onInsertAsImage={insertAssistantImage}
              />
            </div>
          ) : rightPanelTab === "activities" && hasConvex ? (
            <div className="w-[360px] shrink-0 border-l border-border bg-background">
              <ActivityPanel
                presentationId={presentationId}
                isHost={true}
                hostToken={hostToken}
                className="h-full"
              />
            </div>
          ) : rightPanelTab === "questions" && hasConvex ? (
            <div className="w-[360px] shrink-0 border-l border-border bg-background">
              <QuestionPanel
                presentationId={presentationId}
                hostToken={hostToken}
                className="h-full"
              />
            </div>
          ) : null}
        </div>
      </div>

      {pdfRenderSlide && (
        <div
          inert={true}
          className="pointer-events-none fixed -left-[20000px] top-0 h-[1080px] w-[1920px] overflow-hidden opacity-0"
        >
          {pdfRenderSlide.engine === "embed" ? (
            <ActivityEmbedSlide
              ref={pdfEmbedRef}
              slide={pdfRenderSlide}
              previewOnly={true}
              className="h-full w-full bg-white"
            />
          ) : presentation.canvasEngine === "excalidraw" ? (
            <ExcalidrawWrapper
              key={`pdf:${pdfRenderSlide.id}:${pdfRenderSlide.sceneVersion}`}
              initialElements={pdfRenderSlide.engine === "excalidraw" ? pdfRenderSlide.elements : []}
              initialAppState={pdfRenderSlide.engine === "excalidraw" ? pdfRenderSlide.appState : {}}
              initialFiles={pdfRenderSlide.engine === "excalidraw" ? pdfRenderSlide.files : {}}
              isReadonly={true}
              onReady={(api) => {
                pdfExcalidrawApiRef.current = api as ExcalidrawApiLike;
                pdfExcalidrawReadySlideIdRef.current = pdfRenderSlide.id;
              }}
            />
          ) : (
            <TldrawWrapper
              key={`pdf:${pdfRenderSlide.id}:${pdfRenderSlide.sceneVersion}`}
              slideId={pdfRenderSlide.id}
              snapshot={pdfRenderSlide.engine === "tldraw" ? pdfRenderSlide.snapshot : null}
              isReadonly={true}
              onReady={(editor) => {
                pdfTldrawEditorRef.current = editor;
                pdfTldrawReadySlideIdRef.current = pdfRenderSlide.id;
              }}
            />
          )}
        </div>
      )}

      {mcqCaptureDraft ? (
        <div className="pointer-events-none fixed -left-[20000px] top-0 z-[-1] opacity-0">
          <div ref={mcqCaptureRef} className="w-[520px] bg-background p-6">
            <SlideMcqCard draft={mcqCaptureDraft} className="max-w-none" />
          </div>
        </div>
      ) : null}

      <ActivityEmbedDialog
        open={embedDialogOpen}
        onOpenChange={handleEmbedDialogOpenChange}
        url={embedUrlInput}
        title={embedTitleInput}
        onUrlChange={setEmbedUrlInput}
        onTitleChange={setEmbedTitleInput}
        onSubmit={handleSubmitEmbed}
        submitLabel={embedDialogMode === "edit" ? "Save embed" : "Add embed slide"}
      />

      <SlideMcqDialog
        key={`${currentSlide?.id ?? "none"}:${JSON.stringify(currentSlide?.slideQuestionDraft ?? null)}`}
        open={slideMcqDialogOpen}
        onOpenChange={setSlideMcqDialogOpen}
        initialDraft={currentSlide?.slideQuestionDraft}
        onSave={handleSaveSlideMcq}
        onClear={currentSlide?.slideQuestionDraft ? handleClearSlideMcq : undefined}
      />

      <Dialog
        open={pdfDialogOpen}
        onOpenChange={(open) => {
          if (isExportingDeckPdf) return;
          setPdfDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export deck as PDF</DialogTitle>
            <DialogDescription>
              Choose a page format for the exported PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Button
              type="button"
              variant={pdfExportFormat === "fit" ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => setPdfExportFormat("fit")}
              disabled={isExportingDeckPdf}
            >
              Fit to slide ratio
            </Button>
            <Button
              type="button"
              variant={pdfExportFormat === "a4" ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => setPdfExportFormat("a4")}
              disabled={isExportingDeckPdf}
            >
              A4 landscape
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPdfDialogOpen(false)}
              disabled={isExportingDeckPdf}
            >
              Cancel
            </Button>
            <Button onClick={handleExportDeckPdf} disabled={isExportingDeckPdf}>
              {isExportingDeckPdf ? "Exporting..." : "Export PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <ShareDialog
        presentationId={presentationId}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />

      {hasConvex && (
        <EditorConvexNotifications
          presentationId={presentationId}
          hostToken={hostToken}
          ownerToken={ownerToken}
        />
      )}
    </div>
  );
}

/**
 * Inner component mounted only when Convex is available.
 * Subscribes to poll/chat notifications at the editor page level
 * so toasts fire even when the Chat/Polls panels aren't open.
 * Also pushes presentation changes to Convex in the background.
 */
function EditorConvexNotifications({
  presentationId,
  hostToken,
  ownerToken,
}: {
  presentationId: string;
  hostToken: string;
  ownerToken: string;
}) {
  useActivityNotifications(presentationId);
  useQuestionNotifications(presentationId, hostToken);

  // Background cloud sync — push on each updatedAt change, debounced 2 s
  const convexClient = useConvex();
  const presentation = usePresentationStore((s) =>
    s.presentations.find((p) => p.id === presentationId),
  );
  const presentationUpdatedAt = presentation?.updatedAt;
  useEffect(() => {
    if (!presentation) return;
    const timer = setTimeout(() => {
      pushPresentation(convexClient, presentation).catch(console.error);
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convexClient, presentationUpdatedAt]);

  // Live canvas broadcast — throttled 2 s writes to Convex
  useLiveSlideSync(presentationId, ownerToken);

  return null;
}
