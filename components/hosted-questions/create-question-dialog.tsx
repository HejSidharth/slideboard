"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { BarChart2, AlignLeft, Clock, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { nanoid } from "nanoid";
import { cn } from "@/lib/utils";
import type { HostedQuestionType } from "@/types";

const TIMER_PRESETS = [
  { label: "30 s", ms: 30_000 },
  { label: "1 min", ms: 60_000 },
  { label: "2 min", ms: 120_000 },
  { label: "5 min", ms: 300_000 },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presentationId: string;
  hostToken: string;
}

export function CreateQuestionDialog({ open, onOpenChange, presentationId, hostToken }: Props) {
  const create = useMutation(api.hostedQuestions.create);

  const [questionType, setQuestionType] = useState<HostedQuestionType>("mcq");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMs, setTimerMs] = useState(60_000);
  const [customTimerSec, setCustomTimerSec] = useState("");
  const [isCustomTimer, setIsCustomTimer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setQuestionType("mcq");
      setPrompt("");
      setOptions(["", ""]);
      setCorrectIndex(null);
      setTimerEnabled(false);
      setTimerMs(60_000);
      setCustomTimerSec("");
      setIsCustomTimer(false);
    }
  }, [open]);

  const optionRefs = useRef<(HTMLInputElement | null)[]>([]);

  const addOption = useCallback(() => {
    if (options.length >= 8) return;
    setOptions((prev) => [...prev, ""]);
    setTimeout(() => {
      optionRefs.current[options.length]?.focus();
    }, 50);
  }, [options.length]);

  const removeOption = useCallback((idx: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
    setCorrectIndex((prev) => {
      if (prev === null) return null;
      if (prev === idx) return null;
      if (prev > idx) return prev - 1;
      return prev;
    });
  }, []);

  const updateOption = useCallback((idx: number, val: string) => {
    setOptions((prev) => prev.map((o, i) => (i === idx ? val : o)));
  }, []);

  const effectiveTimerMs = isCustomTimer
    ? (parseInt(customTimerSec, 10) || 0) * 1000
    : timerMs;

  const canSubmit =
    prompt.trim().length > 0 &&
    (questionType === "free_response" ||
      options.filter((o) => o.trim()).length >= 2) &&
    (!timerEnabled || effectiveTimerMs > 0);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await create({
        presentationId,
        hostToken,
        questionType,
        prompt: prompt.trim(),
        options:
          questionType === "mcq"
            ? options.map((o) => o.trim()).filter(Boolean)
            : undefined,
        correctIndex:
          questionType === "mcq" && correctIndex !== null
            ? correctIndex
            : undefined,
        timeLimitMs: timerEnabled ? effectiveTimerMs : undefined,
        clientRequestId: nanoid(),
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    submitting,
    create,
    presentationId,
    hostToken,
    questionType,
    prompt,
    options,
    correctIndex,
    timerEnabled,
    effectiveTimerMs,
    onOpenChange,
  ]);

  const optionLabels = "ABCDEFGH";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Question</DialogTitle>
        </DialogHeader>

        {/* Type switcher */}
        <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
          <button
            type="button"
            onClick={() => setQuestionType("mcq")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              questionType === "mcq"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            Multiple Choice
          </button>
          <button
            type="button"
            onClick={() => setQuestionType("free_response")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              questionType === "free_response"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <AlignLeft className="h-3.5 w-3.5" />
            Free Response
          </button>
        </div>

        {/* Prompt */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Question</label>
          <Textarea
            placeholder="Type your question…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
        </div>

        {/* MCQ options */}
        {questionType === "mcq" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Options
                <span className="ml-1 text-muted-foreground/60">(click circle to mark correct)</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setOptions(["A", "B", "C", "D", "IDK"]);
                  setCorrectIndex(null);
                }}
                className="text-[10px] font-medium text-muted-foreground hover:text-foreground border border-border rounded px-1.5 py-0.5 transition-colors"
              >
                A / B / C / D / IDK
              </button>
            </div>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCorrectIndex(correctIndex === idx ? null : idx)}
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                    correctIndex === idx
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-border text-muted-foreground hover:border-green-400",
                  )}
                >
                  {correctIndex === idx ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    optionLabels[idx]
                  )}
                </button>
                <Input
                  ref={(el) => { optionRefs.current[idx] = el; }}
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Option ${optionLabels[idx]}`}
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (idx === options.length - 1) addOption();
                      else optionRefs.current[idx + 1]?.focus();
                    }
                  }}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {options.length < 8 && (
              <button
                type="button"
                onClick={addOption}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Add option
              </button>
            )}
          </div>
        )}

        {/* Timer */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setTimerEnabled((v) => !v)}
            className={cn(
              "flex items-center gap-2 text-xs font-medium transition-colors",
              timerEnabled ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            {timerEnabled ? "Timer enabled" : "Add timer (optional)"}
          </button>

          {timerEnabled && (
            <div className="flex flex-wrap gap-1.5">
              {TIMER_PRESETS.map((p) => (
                <button
                  key={p.ms}
                  type="button"
                  onClick={() => { setTimerMs(p.ms); setIsCustomTimer(false); }}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    !isCustomTimer && timerMs === p.ms
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {p.label}
                </button>
              ))}
              <div className="flex items-center gap-1">
                <Input
                  value={customTimerSec}
                  onChange={(e) => {
                    setCustomTimerSec(e.target.value);
                    setIsCustomTimer(true);
                  }}
                  onFocus={() => setIsCustomTimer(true)}
                  placeholder="Custom"
                  className="h-7 w-20 text-xs"
                />
                <span className="text-xs text-muted-foreground">s</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? "Creating…" : "Create & Launch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
