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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { usePresentationStore } from "@/store/use-presentation-store";
import { SlideThumbnail } from "./slide-thumbnail";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Presentation } from "@/types";

interface SlideSidebarProps {
  presentation: Presentation;
  presentationId: string;
}

export function SlideSidebar({ presentation, presentationId }: SlideSidebarProps) {
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

  return (
    <aside className="w-64 border-r flex flex-col shrink-0 bg-muted/30">
      <div className="p-3 border-b">
        <h2 className="text-sm font-medium text-muted-foreground">Slides</h2>
      </div>
      
      <ScrollArea className="flex-1">
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

      <div className="p-3 border-t">
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => addSlide(presentationId)}
        >
          <Plus className="h-4 w-4" />
          Add Slide
        </Button>
      </div>
    </aside>
  );
}
