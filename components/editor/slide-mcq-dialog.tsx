"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SlideMcqDraft } from "@/types";

interface SlideMcqDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDraft?: SlideMcqDraft;
  onSave: (draft: SlideMcqDraft) => void | Promise<void>;
  onClear?: () => void;
}

const OPTION_LABELS = "ABCDEFGH";

export function SlideMcqDialog({
  open,
  onOpenChange,
  initialDraft,
  onSave,
  onClear,
}: SlideMcqDialogProps) {
  const [prompt, setPrompt] = useState(initialDraft?.prompt ?? "");
  const [options, setOptions] = useState<string[]>(initialDraft?.options ?? ["", ""]);
  const [correctIndex, setCorrectIndex] = useState<number | null>(
    initialDraft?.correctIndex ?? null,
  );

  const canSave =
    prompt.trim().length > 0 &&
    options.map((option) => option.trim()).filter(Boolean).length >= 2;

  const updateOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((option, i) => (i === index ? value : option)));
  };

  const addOption = () => {
    if (options.length >= 8) return;
    setOptions((prev) => [...prev, ""]);
  };

  const removeOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
    setCorrectIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      prompt: prompt.trim(),
      options: options.map((option) => option.trim()).filter(Boolean),
      correctIndex,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Slide MCQ</DialogTitle>
          <DialogDescription>
            Draft a multiple-choice question directly on this slide, then launch it as an activity when you are ready.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Question</label>
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={3}
              className="resize-none text-sm"
              placeholder="Type your multiple-choice question..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Options
              <span className="ml-1 text-muted-foreground/60">(mark the correct answer)</span>
            </label>
            {options.map((option, index) => (
              <div key={`${index}-${OPTION_LABELS[index]}`} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCorrectIndex(correctIndex === index ? null : index)}
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                    correctIndex === index
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/50",
                  )}
                >
                  {correctIndex === index ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    OPTION_LABELS[index]
                  )}
                </button>
                <Input
                  value={option}
                  onChange={(event) => updateOption(index, event.target.value)}
                  placeholder={`Option ${OPTION_LABELS[index]}`}
                  className="h-9 text-sm"
                />
                {options.length > 2 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => removeOption(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))}

            {options.length < 8 ? (
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addOption}>
                <Plus className="h-3.5 w-3.5" />
                Add option
              </Button>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {onClear ? (
              <Button variant="ghost" onClick={onClear}>
                Remove from slide
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              Save question
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
