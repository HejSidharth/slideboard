"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const ExcalidrawWrapper = dynamic(
  () => import("@/components/editor/excalidraw-wrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading canvas...</span>
        </div>
      </div>
    ),
  },
);

interface ExcalidrawModalProps {
  open: boolean;
  onClose: () => void;
}

export function ExcalidrawModal({ open, onClose }: ExcalidrawModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-medium">Scratch Pad</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1">
        <ExcalidrawWrapper initialElements={[]} initialAppState={{}} initialFiles={{}} />
      </div>
    </div>
  );
}
