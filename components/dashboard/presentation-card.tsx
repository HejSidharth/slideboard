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
import { CheckSquare, Copy, MoreVertical, Pencil, Square, Trash2 } from "lucide-react";
import { usePresentationStore } from "@/store/use-presentation-store";
import type { Folder, Presentation as PresentationType } from "@/types";

interface PresentationCardProps {
  presentation: PresentationType;
  isSelected?: boolean;
  selectionMode?: boolean;
  onToggleSelected?: (presentationId: string) => void;
}

export function PresentationCard({
  presentation,
  isSelected = false,
  selectionMode = false,
  onToggleSelected,
}: PresentationCardProps) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newName, setNewName] = useState(presentation.name);

  const {
    folders,
    renamePresentation,
    deletePresentation,
    duplicatePresentation,
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
    if (selectionMode) {
      onToggleSelected?.(presentation.id);
      return;
    }
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

  const slideCount = presentation.slides.length;
  const folderPath = (() => {
    if (!presentation.folderId) return "Unfiled";
    const folder = folders.find((candidate) => candidate.id === presentation.folderId);
    return folder ? getFolderPath(folder) : "Unfiled";
  })();

  return (
    <>
      <Card
        className={[
          "group cursor-pointer overflow-hidden py-0 transition-colors hover:border-primary/40",
          isSelected ? "border-primary bg-primary/5" : "border-border",
        ].join(" ")}
        onClick={handleOpen}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              {selectionMode ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-[-4px] h-8 w-8 shrink-0"
                  aria-label={isSelected ? "Deselect deck" : "Select deck"}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleSelected?.(presentation.id);
                  }}
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
              ) : null}
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold tracking-tight md:text-base">
                  {presentation.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Updated {formatDistanceToNow(presentation.updatedAt)}
                </p>
              </div>
            </div>

            {!selectionMode ? (
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
                  <DropdownMenuItem
                    onSelect={() => {
                      requestAnimationFrame(() => setRenameOpen(true));
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleDuplicate}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Move to folder</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onSelect={() => movePresentationToFolder(presentation.id, null)}>
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
                              onSelect={() => movePresentationToFolder(presentation.id, folder.id)}
                            >
                              {getFolderPath(folder)}
                            </DropdownMenuItem>
                          ))
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => {
                      requestAnimationFrame(() => setDeleteOpen(true));
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{slideCount} {slideCount === 1 ? "slide" : "slides"}</span>
            <span>•</span>
            <span className="max-w-[170px] truncate">{folderPath}</span>
          </div>
        </CardContent>
      </Card>

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
