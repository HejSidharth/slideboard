"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface DesmosModalProps {
  open: boolean;
  onClose: () => void;
}

export function DesmosModal({ open, onClose }: DesmosModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-medium">Calculator</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1">
        <iframe
          src="https://www.desmos.com/scientific"
          className="h-full w-full border-0"
          title="Desmos Scientific Calculator"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    </div>
  );
}
