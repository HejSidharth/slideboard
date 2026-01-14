"use client";

import { usePresentationStore } from "@/store/use-presentation-store";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Presentation } from "@/types";

interface SlideControlsProps {
  presentation: Presentation;
  presentationId: string;
}

export function SlideControls({ presentation, presentationId }: SlideControlsProps) {
  const goToNextSlide = usePresentationStore((s) => s.goToNextSlide);
  const goToPreviousSlide = usePresentationStore((s) => s.goToPreviousSlide);

  const currentIndex = presentation.currentSlideIndex;
  const totalSlides = presentation.slides.length;
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < totalSlides - 1;

  return (
    <div className="h-12 border-t flex items-center justify-center gap-4 bg-muted/30 shrink-0">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={!canGoBack}
            onClick={() => goToPreviousSlide(presentationId)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Previous Slide</TooltipContent>
      </Tooltip>

      <span className="text-sm font-medium min-w-[80px] text-center">
        {currentIndex + 1} / {totalSlides}
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={!canGoForward}
            onClick={() => goToNextSlide(presentationId)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Next Slide</TooltipContent>
      </Tooltip>
    </div>
  );
}
