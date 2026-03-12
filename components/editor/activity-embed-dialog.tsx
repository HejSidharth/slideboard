"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseActivityEmbedInput } from "@/lib/activity-embeds";
import type { ActivityEmbedConfig } from "@/lib/activity-embeds";

interface ActivityEmbedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  onUrlChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onSubmit: (config: ActivityEmbedConfig) => void;
  submitLabel: string;
}

export function ActivityEmbedDialog({
  open,
  onOpenChange,
  url,
  title,
  onUrlChange,
  onTitleChange,
  onSubmit,
  submitLabel,
}: ActivityEmbedDialogProps) {
  const result = useMemo(
    () => parseActivityEmbedInput(url, title),
    [title, url],
  );

  const handleSubmit = () => {
    if (!result.config) return;
    onSubmit(result.config);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Embed content</DialogTitle>
          <DialogDescription>
            Add any activity, tool, or YouTube video as its own slide.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Activity URL</p>
            <Input
              value={url}
              onChange={(event) => onUrlChange(event.target.value)}
              placeholder="Paste any activity or embed URL"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Title override</p>
            <Input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Optional custom title"
            />
          </div>

          <div className="rounded-xl border border-border bg-secondary/40 p-3 text-sm">
            {result.config ? (
              <div className="space-y-1">
                <p className="font-medium text-foreground">{result.config.title}</p>
                <p className="text-muted-foreground">This slide will render inside the deck.</p>
              </div>
            ) : (
              <p className="text-destructive">{result.error}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!result.config}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
