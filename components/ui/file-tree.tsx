"use client";

import React, { createContext, forwardRef, useCallback, useContext, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type TreeViewElement = {
  id: string;
  name: string;
  isSelectable?: boolean;
  children?: TreeViewElement[];
};

type TreeContextProps = {
  selectedId: string | undefined;
  expandedItems: string[];
  handleExpand: (id: string) => void;
  selectItem: (id: string) => void;
};

const TreeContext = createContext<TreeContextProps | null>(null);

function useTree(): TreeContextProps {
  const context = useContext(TreeContext);
  if (!context) {
    throw new Error("useTree must be used within a Tree");
  }
  return context;
}

type TreeProps = {
  selectedId?: string;
  onSelectChange?: (id: string) => void;
  initialExpandedItems?: string[];
} & React.HTMLAttributes<HTMLDivElement>;

const Tree = forwardRef<HTMLDivElement, TreeProps>(
  ({ className, selectedId, onSelectChange, initialExpandedItems = [], children, ...props }, ref) => {
    const [expandedItems, setExpandedItems] = useState<string[]>(initialExpandedItems);

    const handleExpand = useCallback((id: string) => {
      setExpandedItems((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    }, []);

    const selectItem = useCallback(
      (id: string) => {
        onSelectChange?.(id);
      },
      [onSelectChange],
    );

    const value = useMemo(
      () => ({
        selectedId,
        expandedItems,
        handleExpand,
        selectItem,
      }),
      [selectedId, expandedItems, handleExpand, selectItem],
    );

    return (
      <TreeContext.Provider value={value}>
        <div ref={ref} className={cn("w-full", className)} {...props}>
          <div className="flex flex-col gap-1">{children}</div>
        </div>
      </TreeContext.Provider>
    );
  },
);

Tree.displayName = "Tree";

type FolderProps = {
  value: string;
  element: string;
  isSelectable?: boolean;
  isSelect?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

const Folder = forwardRef<HTMLDivElement, FolderProps>(
  ({ className, value, element, isSelectable = true, isSelect, children, ...props }, ref) => {
    const { selectedId, expandedItems, handleExpand, selectItem } = useTree();
    const isExpanded = expandedItems.includes(value);
    const isSelected = isSelect ?? selectedId === value;

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <button
          type="button"
          disabled={!isSelectable}
          className={cn(
            "flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
            isSelected && isSelectable ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary",
            !isSelectable && "cursor-not-allowed opacity-50",
          )}
          onClick={() => {
            handleExpand(value);
            if (isSelectable) selectItem(value);
          }}
        >
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <span className="truncate">{element}</span>
        </button>

        {isExpanded && <div className="ml-3 border-l border-border pl-2">{children}</div>}
      </div>
    );
  },
);

Folder.displayName = "Folder";

type FileProps = {
  value: string;
  isSelectable?: boolean;
  isSelect?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const File = forwardRef<HTMLButtonElement, FileProps>(
  ({ value, className, isSelectable = true, isSelect, children, ...props }, ref) => {
    const { selectedId, selectItem } = useTree();
    const isSelected = isSelect ?? selectedId === value;

    return (
      <button
        ref={ref}
        type="button"
        disabled={!isSelectable}
        className={cn(
          "flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors",
          isSelected && isSelectable ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary",
          !isSelectable && "cursor-not-allowed opacity-50",
          className,
        )}
        onClick={() => selectItem(value)}
        {...props}
      >
        <span className="truncate">{children}</span>
      </button>
    );
  },
);

File.displayName = "File";

export { Tree, Folder, File };
