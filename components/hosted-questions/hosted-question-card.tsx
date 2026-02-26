"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Eye,
  EyeOff,
  Trash2,
  Play,
  Square,
  CheckCircle2,
  Clock,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { HostedQuestionData } from "@/types";
import type { Id } from "@/convex/_generated/dataModel";

interface Props {
  question: HostedQuestionData;
  hostToken: string;
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

export function HostedQuestionCard({ question, hostToken }: Props) {
  const activate = useMutation(api.hostedQuestions.activate);
  const close = useMutation(api.hostedQuestions.close);
  const setResultsVisible = useMutation(api.hostedQuestions.setResultsVisible);
  const remove = useMutation(api.hostedQuestions.remove);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const deleteTimerRef = useCallback(() => {
    setTimeout(() => setDeleteConfirm(false), 3000);
  }, []);

  const remaining = useCountdown(
    question.startedAt,
    question.isActive ? question.timeLimitMs : null,
  );

  // Auto-close when timer expires on host side (best-effort UI reflection)
  useEffect(() => {
    if (remaining === 0 && question.isActive) {
      close({ questionId: question._id as Id<"hostedQuestions">, hostToken }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const handleDelete = useCallback(() => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      deleteTimerRef();
      return;
    }
    remove({ questionId: question._id as Id<"hostedQuestions">, hostToken }).catch(() => {});
  }, [deleteConfirm, deleteTimerRef, remove, question._id, hostToken]);

  const isTimed = !!question.timeLimitMs;
  const isExpired = isTimed && remaining === 0;

  const formatRemaining = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${sec}s`;
  };

  // MCQ answer distribution
  const distribution: number[] = [];
  if (
    question.questionType === "mcq" &&
    question.options &&
    question.answers
  ) {
    for (let i = 0; i < question.options.length; i++) {
      distribution[i] = question.answers.filter((a) => a.mcqIndex === i).length;
    }
  }
  const maxCount = Math.max(...distribution, 1);
  const optionLabels = "ABCDEFGH";

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3 space-y-2.5 text-sm",
        !question.isActive && "opacity-70",
      )}
    >
      {/* Header row */}
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
          {question.isActive && !isExpired && (
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700 dark:bg-green-900/40 dark:text-green-300">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          )}
          {(isExpired || (!question.isActive && question.closedAt)) && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Closed
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {question.isActive && !isExpired ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Close question"
              onClick={() =>
                close({ questionId: question._id as Id<"hostedQuestions">, hostToken }).catch(() => {})
              }
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Re-activate question"
              onClick={() =>
                activate({ questionId: question._id as Id<"hostedQuestions">, hostToken }).catch(() => {})
              }
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title={question.resultsVisible ? "Hide results" : "Reveal results"}
            onClick={() =>
              setResultsVisible({
                questionId: question._id as Id<"hostedQuestions">,
                hostToken,
                visible: !question.resultsVisible,
              }).catch(() => {})
            }
          >
            {question.resultsVisible ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7",
              deleteConfirm
                ? "text-destructive hover:text-destructive"
                : "text-muted-foreground hover:text-destructive",
            )}
            title={deleteConfirm ? "Click again to confirm delete" : "Delete question"}
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
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
              {isExpired ? "Time up" : formatRemaining(remaining)}
            </span>
            <span>{Math.round((remaining / (question.timeLimitMs ?? 1)) * 100)}%</span>
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

      {/* Response count */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Users className="h-3 w-3" />
        {question.answerCount} response{question.answerCount !== 1 ? "s" : ""}
      </div>

      {/* MCQ results (host view, always visible to host) */}
      {question.questionType === "mcq" &&
        question.options &&
        question.answers !== null && (
          <div className="space-y-1.5">
            {question.options.map((opt, idx) => {
              const count = distribution[idx] ?? 0;
              const pct = question.answerCount > 0
                ? Math.round((count / question.answerCount) * 100)
                : 0;
              const isCorrect = question.correctIndex === idx;
              return (
                <div key={idx} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                          isCorrect
                            ? "bg-green-500 text-white"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {isCorrect ? <CheckCircle2 className="h-3 w-3" /> : optionLabels[idx]}
                      </span>
                      {opt}
                    </span>
                    <span className="text-muted-foreground">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        isCorrect ? "bg-green-500" : "bg-primary/60",
                      )}
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* Free response answers (host view) */}
      {question.questionType === "free_response" &&
        question.answers !== null &&
        question.answers.length > 0 && (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {question.answers.map((a) => (
              <div
                key={a.participantId}
                className="rounded-md bg-muted px-2.5 py-1.5 text-xs"
              >
                {a.freeText || <span className="italic text-muted-foreground">(empty)</span>}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
