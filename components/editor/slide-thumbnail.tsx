"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { Copy, Trash2, Eraser, GripVertical } from "lucide-react";
import type { SlideData } from "@/types";

interface SlideThumbnailProps {
  slide: SlideData;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClear: () => void;
  canDelete: boolean;
}

export function SlideThumbnail({
  slide,
  index,
  isActive,
  onClick,
  onDelete,
  onDuplicate,
  onClear,
  canDelete,
}: SlideThumbnailProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Filter out deleted elements - Excalidraw marks deleted elements with isDeleted: true
  const visibleElements = slide.elements.filter(
    (el) => !el.isDeleted
  );
  const hasContent = visibleElements.length > 0;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          className={cn(
            "group relative rounded-lg border-2 bg-card cursor-pointer transition-all",
            "hover:border-primary/50 hover:shadow-md",
            isActive
              ? "border-primary ring-2 ring-primary/20"
              : "border-border",
            isDragging && "opacity-50 shadow-lg"
          )}
          onClick={onClick}
        >
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Slide Number */}
          <div className="absolute top-2 left-7 text-xs font-medium text-muted-foreground">
            {index + 1}
          </div>

          {/* Thumbnail Preview */}
          <div className="aspect-video rounded-md m-2 ml-7 bg-background flex items-center justify-center overflow-hidden">
            {hasContent ? (
              <div className="text-xs text-muted-foreground">
                {visibleElements.length} element{visibleElements.length !== 1 ? "s" : ""}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground/50">Empty</div>
            )}
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuItem onClick={onClear}>
          <Eraser className="h-4 w-4 mr-2" />
          Clear Slide
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={onDelete}
          disabled={!canDelete}
          className={cn(canDelete && "text-destructive focus:text-destructive")}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
