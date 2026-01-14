"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { usePresentationStore } from "@/store/use-presentation-store";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Expand, Shrink } from "lucide-react";

// Dynamically import Excalidraw wrapper
const ExcalidrawWrapper = dynamic(
  () => import("@/components/editor/excalidraw-wrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    ),
  }
);

export default function PresentationModePage() {
  const params = useParams();
  const router = useRouter();
  const presentationId = params.id as string;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const presentation = usePresentationStore((s) =>
    s.presentations.find((p) => p.id === presentationId)
  );
  const setCurrentSlide = usePresentationStore((s) => s.setCurrentSlide);
  const goToNextSlide = usePresentationStore((s) => s.goToNextSlide);
  const goToPreviousSlide = usePresentationStore((s) => s.goToPreviousSlide);

  const currentSlide = presentation?.slides[presentation.currentSlideIndex];
  const currentIndex = presentation?.currentSlideIndex ?? 0;
  const totalSlides = presentation?.slides.length ?? 0;
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < totalSlides - 1;

  // Keyboard navigation
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
  }, [presentation, presentationId, goToNextSlide, goToPreviousSlide, setCurrentSlide]);

  // Auto-hide controls
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setShowControls(false), 3000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    handleMouseMove(); // Initial trigger

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeoutId);
    };
  }, []);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

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

  if (!presentation || !currentSlide) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Presentation not found</h1>
          <Button onClick={() => router.push("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen bg-background overflow-hidden">
      {/* Canvas */}
      <div className="absolute inset-0">
        <ExcalidrawWrapper
          key={currentSlide.id}
          initialElements={currentSlide.elements}
          initialAppState={currentSlide.appState}
          initialFiles={currentSlide.files}
          viewModeEnabled={true}
          zenModeEnabled={true}
        />
      </div>

      {/* Controls Overlay */}
      <div
        className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

        {/* Controls */}
        <div className="relative flex items-center justify-between px-6 py-4">
          {/* Left: Slide navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
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
              className="text-white hover:bg-white/20"
              disabled={!canGoForward}
              onClick={() => goToNextSlide(presentationId)}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          {/* Center: Keyboard hints */}
          <div className="hidden md:flex items-center gap-4 text-white/70 text-sm">
            <span>← → Navigate</span>
            <span>F Fullscreen</span>
            <span>Esc Exit</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
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
              className="text-white hover:bg-white/20"
              onClick={handleExit}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Click areas for navigation */}
      <div className="absolute inset-0 flex pointer-events-none">
        <div
          className="w-1/4 h-full cursor-pointer pointer-events-auto"
          onClick={() => canGoBack && goToPreviousSlide(presentationId)}
        />
        <div className="flex-1" />
        <div
          className="w-1/4 h-full cursor-pointer pointer-events-auto"
          onClick={() => canGoForward && goToNextSlide(presentationId)}
        />
      </div>
    </div>
  );
}
