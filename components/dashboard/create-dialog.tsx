"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { usePresentationStore } from "@/store/use-presentation-store";
import type { CanvasEngine } from "@/types";

interface CreatePresentationDialogProps {
  label?: string;
  showIcon?: boolean;
  buttonSize?: "default" | "sm" | "lg" | "icon";
  className?: string;
  folderId?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function CreatePresentationDialog({
  label = "New Deck",
  showIcon = true,
  buttonSize = "lg",
  className,
  folderId = null,
  open,
  onOpenChange,
  hideTrigger = false,
}: CreatePresentationDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [name, setName] = useState("");
  const [canvasEngine, setCanvasEngine] = useState<CanvasEngine>("tldraw");
  const router = useRouter();
  const createPresentation = usePresentationStore((s) => s.createPresentation);

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = onOpenChange ?? setInternalOpen;

  const handleCreate = () => {
    if (!name.trim()) return;
    const id = createPresentation(name.trim(), folderId, canvasEngine);
    setName("");
    setCanvasEngine("tldraw");
    setDialogOpen(false);
    router.push(`/presentation/${id}`);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    setDialogOpen(nextOpen);
    if (!nextOpen) {
      setName("");
      setCanvasEngine("tldraw");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button size={buttonSize} className={cn(showIcon ? "gap-2" : "", className)}>
            {showIcon && <Plus className="h-5 w-5" />}
            {label}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create SlideBoard Deck</DialogTitle>
          <DialogDescription>
            Name your deck. You can rename it any time.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            id="name"
            placeholder="e.g., Algebra Lesson - Quadratics"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />

          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground">Whiteboard engine</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={canvasEngine === "tldraw" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setCanvasEngine("tldraw")}
              >
                tldraw
              </Button>
              <Button
                type="button"
                variant={canvasEngine === "excalidraw" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setCanvasEngine("excalidraw")}
              >
                Excalidraw
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            Create Deck
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
