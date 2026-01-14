"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "@/lib/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  Download,
  Presentation,
} from "lucide-react";
import { usePresentationStore } from "@/store/use-presentation-store";
import type { Presentation as PresentationType } from "@/types";

interface PresentationCardProps {
  presentation: PresentationType;
}

export function PresentationCard({ presentation }: PresentationCardProps) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newName, setNewName] = useState(presentation.name);

  const {
    renamePresentation,
    deletePresentation,
    duplicatePresentation,
    exportPresentation,
  } = usePresentationStore();

  const handleOpen = () => {
    router.push(`/presentation/${presentation.id}`);
  };

  const handleRename = () => {
    if (newName.trim() && newName !== presentation.name) {
      renamePresentation(presentation.id, newName.trim());
    }
    setRenameOpen(false);
  };

  const handleDuplicate = () => {
    duplicatePresentation(presentation.id);
  };

  const handleDelete = () => {
    deletePresentation(presentation.id);
    setDeleteOpen(false);
  };

  const handleExport = () => {
    const data = exportPresentation(presentation.id);
    if (!data) return;

    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${presentation.name.replace(/[^a-z0-9]/gi, "_")}.slideboard.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const slideCount = presentation.slides.length;

  return (
    <>
      <Card
        className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
        onClick={handleOpen}
      >
        <CardContent className="p-0">
          {/* Thumbnail area */}
          <div className="relative aspect-video bg-muted/50 rounded-t-lg overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <Presentation className="h-12 w-12 text-muted-foreground/30" />
            </div>
            {/* Slide count badge */}
            <div className="absolute bottom-2 right-2 px-2 py-1 text-xs font-medium bg-background/80 backdrop-blur-sm rounded-md">
              {slideCount} {slideCount === 1 ? "slide" : "slides"}
            </div>
          </div>

          {/* Info area */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{presentation.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Edited {formatDistanceToNow(presentation.updatedAt)}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicate}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Presentation</DialogTitle>
            <DialogDescription>
              Enter a new name for your presentation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Presentation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{presentation.name}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
