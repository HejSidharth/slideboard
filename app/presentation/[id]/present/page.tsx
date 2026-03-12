"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { usePresentationStore } from "@/store/use-presentation-store";
import { Button } from "@/components/ui/button";
import { ActivityEmbedSlide } from "@/components/slides/activity-embed-slide";
import { PresentationTimer } from "@/components/editor/presentation-timer";
import { PollPanel } from "@/components/polls/poll-panel";
import { QuestionPanel } from "@/components/questions/question-panel";
import { usePollNotifications } from "@/hooks/use-poll-notifications";
import { useQuestionNotifications } from "@/hooks/use-question-notifications";
import { useHostToken } from "@/hooks/use-host-token";
import { useLiveSlideView } from "@/hooks/use-live-slide-view";
import type { ExcalidrawElement, StoreSnapshot, TLRecord } from "@/types";
import { X, ChevronLeft, ChevronRight, Expand, Shrink, BarChart3, HelpCircle } from "lucide-react";

const TldrawWrapper = dynamic(
  () => import("@/components/editor/tldraw-wrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    ),
  },
);

export default function PresentationModePage() {
  const params = useParams();
  const router = useRouter();
  const presentationId = params.id as string;
  const hasConvex = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  type SidebarTab = "polls" | "questions" | null;
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>(null);
  const sidebarOpen = sidebarTab !== null;

  const presentation = usePresentationStore((s) =>
    s.presentations.find((p) => p.id === presentationId)
  );
  const setCurrentSlide = usePresentationStore((s) => s.setCurrentSlide);
  const goToNextSlide = usePresentationStore((s) => s.goToNextSlide);
  const goToPreviousSlide = usePresentationStore((s) => s.goToPreviousSlide);

  // Live canvas state from the presenter (pushed up from PresentModeConvexOverlay)
  const [liveSnapshotJson, setLiveSnapshotJson] = useState<string | null>(null);
  const [liveEngine, setLiveEngine] = useState<"tldraw" | "excalidraw" | null>(null);
  const prevLiveSlideIndexRef = useRef<number | null>(null);
  const handleLiveState = useCallback(
    (slideIndex: number | null, engine: "tldraw" | "excalidraw" | null, snapshotJson: string | null) => {
      setLiveSnapshotJson(snapshotJson);
      setLiveEngine(engine);
      if (slideIndex !== null && slideIndex !== prevLiveSlideIndexRef.current) {
        prevLiveSlideIndexRef.current = slideIndex;
        setCurrentSlide(presentationId, slideIndex);
      }
    },
    [presentationId, setCurrentSlide],
  );

  const currentSlide = presentation?.slides[presentation.currentSlideIndex];
  const currentIndex = presentation?.currentSlideIndex ?? 0;
  const totalSlides = presentation?.slides.length ?? 0;
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < totalSlides - 1;

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const handleExit = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    router.push(`/presentation/${presentationId}`);
  }, [router, presentationId]);

  useEffect(() => {
    history.pushState(null, "", location.href);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!presentation) return;

      switch (e.key) {
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          goToPreviousSlide(presentationId);
          break;
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ":
          e.preventDefault();
          goToNextSlide(presentationId);
          break;
        case "Escape":
          e.preventDefault();
          handleExit();
          break;
        case "Home":
          e.preventDefault();
          setCurrentSlide(presentationId, 0);
          break;
        case "End":
          e.preventDefault();
          setCurrentSlide(presentationId, presentation.slides.length - 1);
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [presentation, presentationId, goToNextSlide, goToPreviousSlide, setCurrentSlide, handleExit, toggleFullscreen]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setShowControls(false), 3000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    handleMouseMove();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      history.pushState(null, "", location.href);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (!presentation || !currentSlide) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Deck not found</h1>
          <Button onClick={() => router.push("/dashboard")}>Return to Workspace</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-screen w-screen bg-background overflow-hidden"
      style={{ touchAction: "pan-y" }}
    >
      <div className="absolute inset-0">
        {currentSlide.engine === "embed" ? (
          <ActivityEmbedSlide slide={currentSlide} className="h-full w-full" />
        ) : presentation.canvasEngine === "excalidraw" ? (
          <ExcalidrawWrapper
            key={currentSlide.id}
            initialElements={currentSlide.engine === "excalidraw" ? currentSlide.elements : []}
            initialAppState={currentSlide.engine === "excalidraw" ? currentSlide.appState : {}}
            initialFiles={currentSlide.engine === "excalidraw" ? currentSlide.files : {}}
            liveElements={
              hasConvex && liveEngine === "excalidraw" && liveSnapshotJson
                ? (() => {
                    try {
                      return JSON.parse(liveSnapshotJson) as readonly ExcalidrawElement[];
                    } catch {
                      return null;
                    }
                  })()
                : null
            }
            isReadonly={true}
          />
        ) : (
          <TldrawWrapper
            key={currentSlide.id}
            slideId={currentSlide.id}
            snapshot={currentSlide.engine === "tldraw" ? currentSlide.snapshot : null}
            liveSnapshot={
              hasConvex && liveEngine === "tldraw" && liveSnapshotJson
                ? (() => {
                    try {
                      return JSON.parse(liveSnapshotJson) as StoreSnapshot<TLRecord>;
                    } catch {
                      return null;
                    }
                  })()
                : null
            }
            isReadonly={true}
          />
        )}
      </div>

      <div className="pointer-events-auto absolute left-1/2 top-4 z-30 -translate-x-1/2">
        <PresentationTimer presentationId={presentationId} variant="present" />
      </div>

      <div className="absolute bottom-20 right-6 z-10 flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-white/80">
          <span>Press</span>
          <kbd className="rounded border border-white/30 bg-black/50 px-1.5 py-0.5 font-mono text-xs text-white">Esc</kbd>
          <span>to exit</span>
        </div>
        <div className="rounded border border-white/20 bg-black/60 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
          {currentIndex + 1} / {totalSlides}
        </div>
      </div>

      <div
        className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />

        <div className="relative flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white border border-transparent hover:border-white/30 hover:bg-white/20"
              disabled={!canGoBack}
              onClick={() => goToPreviousSlide(presentationId)}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <span className="text-white font-medium min-w-[80px] text-center">
              {currentIndex + 1} / {totalSlides}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white border border-transparent hover:border-white/30 hover:bg-white/20"
              disabled={!canGoForward}
              onClick={() => goToNextSlide(presentationId)}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          <div className="hidden items-center gap-4 text-sm text-white/72 md:flex">
            <span>← → Navigate</span>
            <span>F Fullscreen</span>
            <span>Esc Exit</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white border border-transparent hover:border-white/30 hover:bg-white/20"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <Shrink className="h-5 w-5" />
              ) : (
                <Expand className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white border border-transparent hover:border-white/30 hover:bg-white/20"
              onClick={handleExit}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 flex pointer-events-none">
        <div
          className="w-1/4 h-full cursor-pointer pointer-events-auto"
          onClick={() => canGoBack && goToPreviousSlide(presentationId)}
        />
        <div className="flex-1" />
        {!sidebarOpen && (
          <div
            className="w-1/4 h-full cursor-pointer pointer-events-auto"
            onClick={() => canGoForward && goToNextSlide(presentationId)}
          />
        )}
      </div>

      {hasConvex && (
        <PresentModeConvexOverlay
          presentationId={presentationId}
          showControls={showControls}
          sidebarTab={sidebarTab}
          setSidebarTab={setSidebarTab}
          sidebarOpen={sidebarOpen}
          onLiveState={handleLiveState}
        />
      )}
    </div>
  );
}

/**
 * Inner component mounted only when Convex is available.
 * Allows hooks (usePollNotifications, useChatNotifications) to be called
 * unconditionally inside a component that's always within <ConvexProvider>.
 */
function PresentModeConvexOverlay({
  presentationId,
  showControls,
  sidebarTab,
  setSidebarTab,
  sidebarOpen,
  onLiveState,
}: {
  presentationId: string;
  showControls: boolean;
  sidebarTab: "polls" | "questions" | null;
  setSidebarTab: React.Dispatch<React.SetStateAction<"polls" | "questions" | null>>;
  sidebarOpen: boolean;
  onLiveState: (
    slideIndex: number | null,
    engine: "tldraw" | "excalidraw" | null,
    snapshotJson: string | null,
  ) => void;
}) {
  const hostToken = useHostToken(presentationId);

  // Subscribe to live canvas state and surface it to the parent
  const { liveSlideIndex, liveEngine, liveSnapshotJson } = useLiveSlideView(presentationId);
  const onLiveStateRef = useRef(onLiveState);
  useEffect(() => {
    onLiveStateRef.current = onLiveState;
  }, [onLiveState]);
  useEffect(() => {
    onLiveStateRef.current(liveSlideIndex, liveEngine, liveSnapshotJson);
  }, [liveSlideIndex, liveEngine, liveSnapshotJson]);

  // Always subscribe to notifications, regardless of sidebar state
  usePollNotifications(presentationId);
  useQuestionNotifications(presentationId, hostToken);

  return (
    <>
      {/* Polls/Q&A floating toggles */}
      <div
        className={`absolute top-4 right-4 z-40 flex items-center gap-1 transition-opacity duration-300 ${
          showControls || sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <Button
          variant="ghost"
          size="icon"
          className={`h-9 w-9 backdrop-blur-sm border ${
            sidebarTab === "polls"
              ? "bg-white/30 border-white/50 text-white"
              : "bg-black/40 border-white/20 text-white/80 hover:bg-white/20 hover:text-white"
          }`}
          onClick={() => setSidebarTab((t) => (t === "polls" ? null : "polls"))}
        >
          <BarChart3 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-9 w-9 backdrop-blur-sm border ${
            sidebarTab === "questions"
              ? "bg-white/30 border-white/50 text-white"
              : "bg-black/40 border-white/20 text-white/80 hover:bg-white/20 hover:text-white"
          }`}
          onClick={() => setSidebarTab((t) => (t === "questions" ? null : "questions"))}
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>

      {/* Slide-out sidebar — full width on mobile, 340px on sm+ */}
      <div
        className={`absolute top-0 right-0 z-30 h-full w-full sm:w-[340px] transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full border-l border-white/10 bg-background/95 backdrop-blur-md shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-0.5">
              <Button
                variant={sidebarTab === "polls" ? "default" : "ghost"}
                size="sm"
                className="h-6 gap-1 px-2.5 text-xs"
                onClick={() => setSidebarTab("polls")}
              >
                <BarChart3 className="h-3 w-3" />
                Polls
              </Button>
              <Button
                variant={sidebarTab === "questions" ? "default" : "ghost"}
                size="sm"
                className="h-6 gap-1 px-2.5 text-xs"
                onClick={() => setSidebarTab("questions")}
              >
                <HelpCircle className="h-3 w-3" />
                Q&amp;A
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSidebarTab(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-[calc(100%-44px)]">
            {sidebarTab === "polls" && (
              <PollPanel
                presentationId={presentationId}
                className="h-full"
              />
            )}
            {sidebarTab === "questions" && (
              <QuestionPanel
                presentationId={presentationId}
                className="h-full"
                hostToken={hostToken}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
