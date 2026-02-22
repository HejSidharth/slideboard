"use client";

import { useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { usePresentationStore } from "@/store/use-presentation-store";
import { SlideThumbnail } from "./slide-thumbnail";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, PanelLeft, PanelLeftClose } from "lucide-react";
import type { Presentation } from "@/types";

interface SlideSidebarProps {
  presentation: Presentation;
  presentationId: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function SlideSidebar({ 
  presentation, 
  presentationId,
  collapsed = false,
  onCollapsedChange,
}: SlideSidebarProps) {
  const addSlide = usePresentationStore((s) => s.addSlide);
  const reorderSlides = usePresentationStore((s) => s.reorderSlides);
  const setCurrentSlide = usePresentationStore((s) => s.setCurrentSlide);
  const deleteSlide = usePresentationStore((s) => s.deleteSlide);
  const duplicateSlide = usePresentationStore((s) => s.duplicateSlide);
  const clearSlide = usePresentationStore((s) => s.clearSlide);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = presentation.slides.findIndex((s) => s.id === active.id);
        const newIndex = presentation.slides.findIndex((s) => s.id === over.id);
        reorderSlides(presentationId, oldIndex, newIndex);
      }
    },
    [presentation.slides, presentationId, reorderSlides]
  );

  const handleSlideClick = useCallback(
    (index: number) => {
      setCurrentSlide(presentationId, index);
    },
    [presentationId, setCurrentSlide]
  );

  const handleDeleteSlide = useCallback(
    (index: number) => {
      deleteSlide(presentationId, index);
    },
    [presentationId, deleteSlide]
  );

  const handleDuplicateSlide = useCallback(
    (index: number) => {
      duplicateSlide(presentationId, index);
    },
    [presentationId, duplicateSlide]
  );

  const handleClearSlide = useCallback(
    (index: number) => {
      clearSlide(presentationId, index);
    },
    [presentationId, clearSlide]
  );

  // Collapsed state - show only expand button
  if (collapsed) {
    return (
      <aside className="w-12 shrink-0 border-r border-border bg-background py-3 transition-all duration-200 flex flex-col items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onCollapsedChange?.(false)}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Expand sidebar</TooltipContent>
        </Tooltip>
      </aside>
    );
  }

  // Expanded state - full sidebar
  return (
    <aside className="w-72 shrink-0 border-r border-border bg-background transition-all duration-200 flex min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-border p-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Slides</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onCollapsedChange?.(true)}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Collapse sidebar</TooltipContent>
        </Tooltip>
      </div>
      
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3 space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={presentation.slides.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {presentation.slides.map((slide, index) => (
                <SlideThumbnail
                  key={slide.id}
                  slide={slide}
                  index={index}
                  isActive={index === presentation.currentSlideIndex}
                  onClick={() => handleSlideClick(index)}
                  onDelete={() => handleDeleteSlide(index)}
                  onDuplicate={() => handleDuplicateSlide(index)}
                  onClear={() => handleClearSlide(index)}
                  canDelete={presentation.slides.length > 1}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border p-3">
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => addSlide(presentationId)}
        >
          <Plus className="h-4 w-4" />
          Add slide
        </Button>
      </div>
    </aside>
  );
}
