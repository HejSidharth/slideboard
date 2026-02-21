"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Copy, Trash2, Eraser, GripVertical } from "lucide-react";
import { getSlidePreview } from "@/lib/slide-previews";
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

function countShapesInSnapshot(snapshot: SlideData["snapshot"]): number {
  if (!snapshot || !snapshot.store) return 0;
  let count = 0;
  for (const key in snapshot.store) {
    const record = (snapshot.store as unknown as Record<string, unknown>)[key];
    if (record && typeof record === "object" && "typeName" in record) {
      if ((record as { typeName: string }).typeName === "shape") {
        count++;
      }
    }
  }
  return count;
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  const shapeCount = countShapesInSnapshot(slide.snapshot);
  const hasContent = shapeCount > 0;

  useEffect(() => {
    let active = true;

    const loadPreview = async () => {
      const url = await getSlidePreview(slide.id);
      if (!active) return;
      setPreviewUrl(url);
    };

    void loadPreview();

    const onPreviewUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ slideId: string }>;
      if (customEvent.detail?.slideId !== slide.id) return;
      void loadPreview();
    };

    window.addEventListener("slide-preview-updated", onPreviewUpdated as EventListener);

    return () => {
      active = false;
      window.removeEventListener("slide-preview-updated", onPreviewUpdated as EventListener);
    };
  }, [slide.id]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={setNodeRef}
            style={style}
            className={cn(
              "group relative cursor-pointer rounded-lg border bg-card transition-colors",
              "hover:border-primary/50 hover:bg-secondary/70",
              isActive
                ? "border-primary bg-accent"
                : "border-border",
              isDragging && "opacity-50"
            )}
            onClick={onClick}
          >
            <div className="flex items-center justify-between border-b border-border/80 px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <div
                  {...attributes}
                  {...listeners}
                  className="cursor-grab rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted active:cursor-grabbing"
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </div>
                <span className="rounded-sm border border-border bg-background px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {index + 1}
                </span>
              </div>

              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div className="relative m-2 aspect-video overflow-hidden rounded-md border border-border bg-background flex items-center justify-center">
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt={`Slide ${index + 1} preview`}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : hasContent ? (
                <div className="text-xs text-muted-foreground">
                  {shapeCount} shape{shapeCount !== 1 ? "s" : ""}
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
            onClick={() => setShowDeleteConfirm(true)}
            disabled={!canDelete}
            className={cn(canDelete && "text-destructive focus:text-destructive")}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Slide {index + 1}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The slide and all of its content will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
