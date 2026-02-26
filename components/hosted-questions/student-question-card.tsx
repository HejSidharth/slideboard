"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock, Calculator, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { DesmosModal } from "./desmos-modal";
import { ExcalidrawModal } from "./excalidraw-modal";
import type { HostedQuestionData } from "@/types";
import type { Id } from "@/convex/_generated/dataModel";

interface Props {
  question: HostedQuestionData;
  participantId: string;
}

function useCountdown(startedAt: number | null, timeLimitMs: number | null) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!startedAt || !timeLimitMs) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRemaining(null);
      return;
    }
    const tick = () => {
      const r = startedAt + timeLimitMs - Date.now();
      setRemaining(Math.max(0, r));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [startedAt, timeLimitMs]);

  return remaining;
}

const optionLabels = "ABCDEFGH";

export function StudentQuestionCard({ question, participantId }: Props) {
  const submitAnswer = useMutation(api.hostedQuestions.submitAnswer);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    question.myAnswer?.mcqIndex ?? null,
  );
  const [freeText, setFreeText] = useState<string>(
    question.myAnswer?.freeText ?? "",
  );
  const [submitted, setSubmitted] = useState(!!question.myAnswer);
  const [submitting, setSubmitting] = useState(false);
  const [desmosOpen, setDesmosOpen] = useState(false);
  const [excalidrawOpen, setExcalidrawOpen] = useState(false);

  const remaining = useCountdown(
    question.startedAt,
    question.isActive ? question.timeLimitMs : null,
  );

  const isClosed = !question.isActive || (remaining !== null && remaining === 0);
  const isTimed = !!question.timeLimitMs;

  const formatRemaining = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${sec}s`;
  };

  const handleSubmit = useCallback(async () => {
    if (submitting || isClosed) return;
    setSubmitting(true);
    try {
      await submitAnswer({
        questionId: question._id as Id<"hostedQuestions">,
        participantId,
        mcqIndex:
          question.questionType === "mcq" && selectedIndex !== null
            ? selectedIndex
            : undefined,
        freeText:
          question.questionType === "free_response" ? freeText : undefined,
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    isClosed,
    submitAnswer,
    question._id,
    question.questionType,
    participantId,
    selectedIndex,
    freeText,
  ]);

  // MCQ answer distribution for results view
  const distribution: number[] = [];
  if (
    question.questionType === "mcq" &&
    question.options &&
    question.resultsVisible &&
    question.answers
  ) {
    for (let i = 0; i < question.options.length; i++) {
      distribution[i] = question.answers.filter((a) => a.mcqIndex === i).length;
    }
  }

  const canSubmitMcq =
    question.questionType === "mcq" && selectedIndex !== null && !isClosed;
  const canSubmitFree =
    question.questionType === "free_response" &&
    freeText.trim().length > 0 &&
    !isClosed;

  return (
    <>
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-3 space-y-2.5 text-sm",
          isClosed && "opacity-80",
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                question.questionType === "mcq"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                  : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
              )}
            >
              {question.questionType === "mcq" ? "MCQ" : "Free Response"}
            </span>
            {question.isActive && !isClosed && (
              <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700 dark:bg-green-900/40 dark:text-green-300">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            )}
            {isClosed && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Closed
              </span>
            )}
          </div>

          {/* Scratch-pad toolbar */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Open calculator"
              onClick={() => setDesmosOpen(true)}
            >
              <Calculator className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Open scratch pad"
              onClick={() => setExcalidrawOpen(true)}
            >
              <PenLine className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Prompt */}
        <p className="font-medium leading-snug">{question.prompt}</p>

        {/* Timer bar */}
        {isTimed && question.isActive && remaining !== null && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {remaining === 0 ? "Time up" : formatRemaining(remaining)}
              </span>
              <span>
                {Math.round((remaining / (question.timeLimitMs ?? 1)) * 100)}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  remaining / (question.timeLimitMs ?? 1) < 0.2
                    ? "bg-red-500"
                    : "bg-primary",
                )}
                style={{
                  width: `${(remaining / (question.timeLimitMs ?? 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* MCQ options */}
        {question.questionType === "mcq" && question.options && (
          <div className="space-y-1.5">
            {question.options.map((opt, idx) => {
              const isSelected = selectedIndex === idx;
              const isCorrect =
                question.resultsVisible && question.correctIndex === idx;
              const isMyAnswer = question.myAnswer?.mcqIndex === idx;
              const count = distribution[idx] ?? 0;
              const pct =
                question.resultsVisible && question.answerCount > 0
                  ? Math.round((count / question.answerCount) * 100)
                  : null;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isClosed || submitted}
                  onClick={() => !submitted && !isClosed && setSelectedIndex(idx)}
                  className={cn(
                    "relative w-full rounded-md border px-3 py-2 text-left text-xs font-medium transition-colors overflow-hidden",
                    isCorrect
                      ? "border-green-500 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200"
                      : isSelected || isMyAnswer
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted",
                    (isClosed || submitted) && "cursor-default",
                  )}
                >
                  {/* Progress bar overlay when results visible */}
                  {pct !== null && (
                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-md opacity-20",
                        isCorrect ? "bg-green-500" : "bg-primary",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        isCorrect
                          ? "bg-green-500 text-white"
                          : isSelected || isMyAnswer
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {isCorrect ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        optionLabels[idx]
                      )}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {pct !== null && (
                      <span className="ml-auto shrink-0 text-muted-foreground">
                        {pct}%
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Free response */}
        {question.questionType === "free_response" && (
          <Textarea
            value={freeText}
            onChange={(e) => !submitted && !isClosed && setFreeText(e.target.value)}
            placeholder={
              submitted
                ? "Answer submitted."
                : isClosed
                  ? "This question is closed."
                  : "Type your answer…"
            }
            rows={3}
            disabled={submitted || isClosed}
            className="resize-none text-xs"
          />
        )}

        {/* Submit button */}
        {!submitted && !isClosed && (
          <Button
            size="sm"
            className="w-full h-8 text-xs"
            disabled={
              submitting ||
              (question.questionType === "mcq" ? !canSubmitMcq : !canSubmitFree)
            }
            onClick={handleSubmit}
          >
            {submitting ? "Submitting…" : "Submit"}
          </Button>
        )}

        {submitted && !isClosed && (
          <p className="text-center text-xs text-muted-foreground">
            Answer submitted.
          </p>
        )}
      </div>

      <DesmosModal open={desmosOpen} onClose={() => setDesmosOpen(false)} />
      <ExcalidrawModal
        open={excalidrawOpen}
        onClose={() => setExcalidrawOpen(false)}
      />
    </>
  );
}
