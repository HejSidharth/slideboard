"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Clock, Plus, Trash2, Check } from "lucide-react";
import { nanoid } from "nanoid";
import { cn } from "@/lib/utils";

type ActivityKind =
  | "poll_mcq"
  | "poll_confidence"
  | "question_mcq"
  | "question_frq";

const TIMER_PRESETS = [
  { label: "30 s", ms: 30_000 },
  { label: "1 min", ms: 60_000 },
  { label: "2 min", ms: 120_000 },
  { label: "5 min", ms: 300_000 },
];

const KIND_CARDS: {
  kind: ActivityKind;
  label: string;
  description: string;
}[] = [
  {
    kind: "poll_mcq",
    label: "Poll",
    description: "Multiple choice poll",
  },
  {
    kind: "poll_confidence",
    label: "Confidence",
    description: "5-star confidence rating",
  },
  {
    kind: "question_mcq",
    label: "Question",
    description: "Multiple choice with answer",
  },
  {
    kind: "question_frq",
    label: "Free Response",
    description: "Open-ended text answer",
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presentationId: string;
  participantId: string;
  hostToken: string;
}

export function CreateActivityDialog({
  open,
  onOpenChange,
  presentationId,
  participantId,
  hostToken,
}: Props) {
  const createPoll = useMutation(api.polls.create);
  const createQuestion = useMutation(api.hostedQuestions.create);

  const [kind, setKind] = useState<ActivityKind>("poll_mcq");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMs, setTimerMs] = useState(60_000);
  const [customTimerSec, setCustomTimerSec] = useState("");
  const [isCustomTimer, setIsCustomTimer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const optionRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset all state when dialog opens
  useEffect(() => {
    if (open) {
      setKind("poll_mcq");
      setPrompt("");
      setOptions(["", ""]);
      setCorrectIndex(null);
      setTimerEnabled(false);
      setTimerMs(60_000);
      setCustomTimerSec("");
      setIsCustomTimer(false);
    }
  }, [open]);

  // Reset options when switching to/from MCQ kinds
  useEffect(() => {
    if (kind === "poll_mcq" || kind === "question_mcq") {
      setOptions((prev) => (prev.length >= 2 ? prev : ["", ""]));
      setCorrectIndex(null);
    }
  }, [kind]);

  const isMcq = kind === "poll_mcq" || kind === "question_mcq";
  const isQuestion = kind === "question_mcq" || kind === "question_frq";
  const isPoll = kind === "poll_mcq" || kind === "poll_confidence";

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
    (!isMcq || options.filter((o) => o.trim()).length >= 2) &&
    (!timerEnabled || effectiveTimerMs > 0);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      if (isPoll) {
        await createPoll({
          presentationId,
          question: prompt.trim(),
          options:
            kind === "poll_mcq"
              ? options.map((o) => o.trim()).filter(Boolean)
              : [],
          pollType:
            kind === "poll_confidence" ? "confidence" : "multiple_choice",
          createdBy: participantId,
          clientRequestId: nanoid(),
        });
      } else {
        await createQuestion({
          presentationId,
          hostToken,
          questionType: kind === "question_mcq" ? "mcq" : "free_response",
          prompt: prompt.trim(),
          options:
            kind === "question_mcq"
              ? options.map((o) => o.trim()).filter(Boolean)
              : undefined,
          correctIndex:
            kind === "question_mcq" && correctIndex !== null
              ? correctIndex
              : undefined,
          timeLimitMs: timerEnabled ? effectiveTimerMs : undefined,
          clientRequestId: nanoid(),
        });
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    submitting,
    isPoll,
    createPoll,
    createQuestion,
    presentationId,
    hostToken,
    participantId,
    kind,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New Activity</DialogTitle>
          <DialogDescription>
            Choose a type, write your prompt, then launch to students.
          </DialogDescription>
        </DialogHeader>

        {/* ── Type selector ── */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Type</label>
          <div className="grid grid-cols-2 gap-2">
            {KIND_CARDS.map(({ kind: k, label, description }) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-colors",
                  kind === k
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border hover:bg-muted",
                )}
              >
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">
                  {description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* ── Prompt ── */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {isQuestion ? "Question" : "Prompt"}
          </label>
          <Textarea
            placeholder={
              isQuestion
                ? "Type your question..."
                : "Type your prompt..."
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
        </div>

        {/* ── MCQ options ── */}
        {isMcq && (
          <>
            <Separator />
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Options
                  {kind === "question_mcq" && (
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      -- click letter to mark correct
                    </span>
                  )}
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setOptions(["A", "B", "C", "D", "IDK"]);
                    setCorrectIndex(null);
                  }}
                >
                  A / B / C / D / IDK
                </Button>
              </div>

              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {/* Letter badge / correct-answer toggle */}
                  {kind === "question_mcq" ? (
                    <button
                      type="button"
                      onClick={() =>
                        setCorrectIndex(correctIndex === idx ? null : idx)
                      }
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold transition-colors",
                        correctIndex === idx
                          ? "border-green-600 bg-green-600 text-white"
                          : "border-border text-muted-foreground hover:border-green-500 hover:text-green-600",
                      )}
                    >
                      {correctIndex === idx ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        optionLabels[idx]
                      )}
                    </button>
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-xs font-semibold text-muted-foreground">
                      {optionLabels[idx]}
                    </span>
                  )}

                  <Input
                    ref={(el) => {
                      optionRefs.current[idx] = el;
                    }}
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    placeholder={`Option ${optionLabels[idx]}`}
                    className="h-9 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (idx === options.length - 1) addOption();
                        else optionRefs.current[idx + 1]?.focus();
                      }
                    }}
                  />

                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeOption(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}

              {options.length < 8 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={addOption}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add option
                </Button>
              )}
            </div>
          </>
        )}

        {/* ── Confidence hint ── */}
        {kind === "poll_confidence" && (
          <>
            <Separator />
            <p className="text-sm text-muted-foreground">
              Students will rate their confidence from 1 to 5 stars.
            </p>
          </>
        )}

        {/* ── Timer (question types only) ── */}
        {isQuestion && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Timer</label>
                <Button
                  type="button"
                  variant={timerEnabled ? "default" : "outline"}
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => setTimerEnabled((v) => !v)}
                >
                  <Clock className="h-3 w-3" />
                  {timerEnabled ? "Enabled" : "Off"}
                </Button>
              </div>

              {timerEnabled && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {TIMER_PRESETS.map((p) => (
                    <Button
                      key={p.ms}
                      type="button"
                      variant={
                        !isCustomTimer && timerMs === p.ms
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setTimerMs(p.ms);
                        setIsCustomTimer(false);
                      }}
                    >
                      {p.label}
                    </Button>
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
                      className={cn(
                        "h-7 w-20 text-xs",
                        isCustomTimer && "border-primary",
                      )}
                    />
                    <span className="text-xs text-muted-foreground">sec</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Footer ── */}
        <Separator />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? "Creating..." : "Create & Launch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
