"use client";

import { useMemo, useRef, useState } from "react";
import { usePresentationStore } from "@/store/use-presentation-store";
import { PresentationCard } from "./presentation-card";
import { CreatePresentationDialog } from "./create-dialog";
import { Button } from "@/components/ui/button";
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, FileText, Plus, Upload } from "lucide-react";
import { File, Folder, Tree } from "@/components/ui/file-tree";
import type { Folder as FolderType } from "@/types";

const ALL_SCOPE = "all";
const UNFILED_SCOPE = "unfiled";

type FolderScope = typeof ALL_SCOPE | typeof UNFILED_SCOPE | string;
type SortBy = "updated" | "created" | "name";

function openAfterContextMenu(action: () => void): void {
  requestAnimationFrame(() => {
    action();
  });
}

function collectDescendantIds(folders: FolderType[], folderId: string): Set<string> {
  const ids = new Set<string>([folderId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const folder of folders) {
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        changed = true;
      }
    }
  }

  return ids;
}

export function PresentationList() {
  const presentations = usePresentationStore((s) => s.presentations);
  const folders = usePresentationStore((s) => s.folders);
  const importPresentation = usePresentationStore((s) => s.importPresentation);
  const movePresentationToFolder = usePresentationStore((s) => s.movePresentationToFolder);
  const createFolder = usePresentationStore((s) => s.createFolder);
  const renameFolder = usePresentationStore((s) => s.renameFolder);
  const deleteFolder = usePresentationStore((s) => s.deleteFolder);

  const [scope, setScope] = useState<FolderScope>(ALL_SCOPE);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("updated");
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [createDeckOpen, setCreateDeckOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderParentId, setFolderParentId] = useState<string | null>(null);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [createDeckFolderId, setCreateDeckFolderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedFolder = useMemo(
    () => folders.find((folder) => folder.id === scope) ?? null,
    [folders, scope],
  );

  const scopeLabel =
    scope === ALL_SCOPE
      ? "All Decks"
      : scope === UNFILED_SCOPE
        ? "Unfiled"
        : selectedFolder?.name ?? "Folder";

  const childrenMap = useMemo(() => {
    const map = new Map<string | null, FolderType[]>();
    for (const folder of folders) {
      const key = folder.parentId;
      const list = map.get(key) ?? [];
      list.push(folder);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [folders]);

  const scopedPresentations = useMemo(() => {
    if (scope === ALL_SCOPE) return presentations;
    if (scope === UNFILED_SCOPE) return presentations.filter((presentation) => !presentation.folderId);
    const descendants = collectDescendantIds(folders, scope);
    return presentations.filter(
      (presentation) => presentation.folderId && descendants.has(presentation.folderId),
    );
  }, [scope, folders, presentations]);

  const searchedPresentations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return scopedPresentations;
    return scopedPresentations.filter((presentation) =>
      presentation.name.toLowerCase().includes(query),
    );
  }, [scopedPresentations, searchQuery]);

  const sortedPresentations = useMemo(() => {
    const decks = [...searchedPresentations];
    if (sortBy === "name") {
      return decks.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortBy === "created") {
      return decks.sort((a, b) => b.createdAt - a.createdAt);
    }
    return decks.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [searchedPresentations, sortBy]);

  const currentFolderId = scope !== ALL_SCOPE && scope !== UNFILED_SCOPE ? scope : null;

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedId = importPresentation(text);
      if (importedId && currentFolderId) {
        movePresentationToFolder(importedId, currentFolderId);
      }
    } catch (error) {
      console.error("Failed to import file:", error);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openCreateDeck = (folderId: string | null) => {
    setCreateDeckFolderId(folderId);
    openAfterContextMenu(() => {
      setCreateDeckOpen(true);
    });
  };

  const openCreateFolder = (parentId: string | null) => {
    setFolderParentId(parentId);
    setFolderName("");
    openAfterContextMenu(() => {
      setCreateFolderOpen(true);
    });
  };

  const submitCreateFolder = () => {
    if (!folderName.trim()) return;
    const id = createFolder(folderName.trim(), folderParentId);
    setScope(id);
    setCreateFolderOpen(false);
    setFolderName("");
    setFolderParentId(null);
  };

  const submitRenameFolder = () => {
    if (!renameFolderId || !folderName.trim()) return;
    renameFolder(renameFolderId, folderName.trim());
    setRenameFolderOpen(false);
    setRenameFolderId(null);
    setFolderName("");
  };

  const openRenameFolder = (folder: FolderType) => {
    setRenameFolderId(folder.id);
    setFolderName(folder.name);
    openAfterContextMenu(() => {
      setRenameFolderOpen(true);
    });
  };

  const deleteFolderWithScopeReset = (folderId: string) => {
    if (scope !== ALL_SCOPE && scope !== UNFILED_SCOPE) {
      const descendants = collectDescendantIds(folders, folderId);
      if (descendants.has(scope)) {
        setScope(ALL_SCOPE);
      }
    }
    deleteFolder(folderId);
  };

  const renderFolderNodes = (parentId: string | null): React.ReactNode => {
    const nodes = childrenMap.get(parentId) ?? [];
    return nodes.map((folder) => (
      <ContextMenu key={folder.id}>
        <ContextMenuTrigger asChild>
          <div>
            <Folder value={folder.id} element={folder.name}>
              {renderFolderNodes(folder.id)}
            </Folder>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={() => openCreateFolder(folder.id)}>New Folder</ContextMenuItem>
          <ContextMenuItem onSelect={() => openCreateDeck(folder.id)}>New Deck</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => openRenameFolder(folder)}>Rename Folder</ContextMenuItem>
          <ContextMenuItem variant="destructive" onSelect={() => deleteFolderWithScopeReset(folder.id)}>
            Delete Folder
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    ));
  };

  return (
    <div>
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Workspace / {scopeLabel}</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">Decks</h2>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-9 gap-1.5 px-3 text-xs">
                <Plus className="h-4 w-4" />
                Create
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => openCreateDeck(currentFolderId)}>New Deck</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openCreateFolder(currentFolderId)}>New Folder</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Import Deck
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search decks..."
            className="h-9 sm:max-w-xs"
          />

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 gap-1.5 px-3 text-xs">
                  Sort: {sortBy === "updated" ? "Last edited" : sortBy === "created" ? "Created" : "Name"}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setSortBy("updated")}>Last edited</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSortBy("created")}>Created</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSortBy("name")}>Name</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <p className="text-xs text-muted-foreground">
              {sortedPresentations.length} {sortedPresentations.length === 1 ? "deck" : "decks"}
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.slideboard.json"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <aside className="rounded-xl border border-border bg-card p-3">
              <p className="mb-2 text-xs text-muted-foreground">Views</p>
              <Tree selectedId={scope} onSelectChange={setScope}>
                <File value={ALL_SCOPE}>All Decks</File>
                <File value={UNFILED_SCOPE}>Unfiled</File>
              </Tree>

              <div className="my-3 border-t border-border/70" />

              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Folders</p>
                <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => openCreateFolder(currentFolderId)}>
                  New Folder
                </Button>
              </div>

              <Tree selectedId={scope} onSelectChange={setScope} initialExpandedItems={folders.map((folder) => folder.id)}>
                {renderFolderNodes(null)}
              </Tree>
            </aside>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onSelect={() => openCreateFolder(currentFolderId)}>New Folder</ContextMenuItem>
            <ContextMenuItem onSelect={() => openCreateDeck(currentFolderId)}>New Deck</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <section>
          {sortedPresentations.length === 0 ? (
            <div className="flex min-h-[36vh] flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-10 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-secondary">
                <FileText className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold tracking-tight">
                {searchQuery.trim() ? "No matching decks" : "No decks here yet"}
              </h3>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {searchQuery.trim()
                  ? "Try a different deck name or clear your search."
                  : "Create a deck in this view or import an existing SlideBoard file."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {sortedPresentations.map((presentation) => (
                <PresentationCard key={presentation.id} presentation={presentation} />
              ))}
            </div>
          )}
        </section>
      </div>

      <CreatePresentationDialog
        open={createDeckOpen}
        onOpenChange={setCreateDeckOpen}
        folderId={createDeckFolderId}
        hideTrigger
      />

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{folderParentId ? "Create Subfolder" : "Create Folder"}</DialogTitle>
            <DialogDescription>
              Keep decks organized by subject, unit, or class.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Input
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="e.g., Math / Algebra"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitCreateFolder();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitCreateFolder} disabled={!folderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameFolderOpen} onOpenChange={setRenameFolderOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <Input
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitRenameFolder();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitRenameFolder} disabled={!folderName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
