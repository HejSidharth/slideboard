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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
} from "lucide-react";
import { usePresentationStore } from "@/store/use-presentation-store";
import type { Folder, Presentation as PresentationType } from "@/types";

interface PresentationCardProps {
  presentation: PresentationType;
}

export function PresentationCard({ presentation }: PresentationCardProps) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newName, setNewName] = useState(presentation.name);

  const {
    folders,
    renamePresentation,
    deletePresentation,
    duplicatePresentation,
    exportPresentation,
    movePresentationToFolder,
  } = usePresentationStore();

  const folderNameById = new Map(folders.map((folder) => [folder.id, folder.name]));

  const getFolderPath = (folder: Folder): string => {
    const segments: string[] = [folder.name];
    let parentId = folder.parentId;

    while (parentId) {
      const parentName = folderNameById.get(parentId);
      if (!parentName) break;
      segments.unshift(parentName);
      const parent = folders.find((candidate) => candidate.id === parentId);
      parentId = parent?.parentId ?? null;
    }

    return segments.join(" / ");
  };

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
        className="group cursor-pointer border-border py-0 transition-colors hover:border-primary/40"
        onClick={handleOpen}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold tracking-tight md:text-base">{presentation.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Updated {formatDistanceToNow(presentation.updatedAt)}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-65 transition-opacity group-hover:opacity-100"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Move to folder</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => movePresentationToFolder(presentation.id, null)}>
                      Unfiled
                    </DropdownMenuItem>
                    {folders.length === 0 ? (
                      <DropdownMenuItem disabled>No folders</DropdownMenuItem>
                    ) : (
                      folders
                        .slice()
                        .sort((a, b) => getFolderPath(a).localeCompare(getFolderPath(b)))
                        .map((folder) => (
                          <DropdownMenuItem
                            key={folder.id}
                            onClick={() => movePresentationToFolder(presentation.id, folder.id)}
                          >
                            {getFolderPath(folder)}
                          </DropdownMenuItem>
                        ))
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span>{slideCount} {slideCount === 1 ? "slide" : "slides"}</span>
            <span>Open deck</span>
          </div>
        </CardContent>
      </Card>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Deck</DialogTitle>
            <DialogDescription>
              Enter a new name for this SlideBoard deck.
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
            <DialogTitle>Delete Deck</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this deck: {presentation.name}? This action cannot be undone.
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
