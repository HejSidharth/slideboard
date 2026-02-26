"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Eye,
  EyeOff,
  Trash2,
  Play,
  Square,
  CheckCircle2,
  Clock,
  Users,
  Star,
  Calculator,
  PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DesmosModal } from "@/components/hosted-questions/desmos-modal";
import { ExcalidrawModal } from "@/components/hosted-questions/excalidraw-modal";
import type { UnifiedActivity } from "@/types";
import type { Id } from "@/convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Countdown hook (shared by question variants)
// ---------------------------------------------------------------------------

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

function formatMs(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${sec}s`;
}

const OPTION_LABELS = "ABCDEFGH";

// ---------------------------------------------------------------------------
// Kind badge
// ---------------------------------------------------------------------------

function KindBadge({ activity }: { activity: UnifiedActivity }) {
  const map: Record<UnifiedActivity["kind"], { label: string; className: string }> = {
    poll_mcq: {
      label: "Poll",
      className:
        "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    },
    poll_confidence: {
      label: "Confidence",
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    },
    question_mcq: {
      label: "MCQ",
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    },
    question_frq: {
      label: "Free Response",
      className:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    },
  };
  const { label, className } = map[activity.kind];
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        className,
      )}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  activity: UnifiedActivity;
  isHost: boolean;
  /** Required for host actions */
  hostToken?: string;
  /** Required for poll votes (participantId) */
  participantId: string;
}

// ---------------------------------------------------------------------------
// ActivityCard
// ---------------------------------------------------------------------------

export function ActivityCard({ activity, isHost, hostToken, participantId }: Props) {
  // -------------------------------------------------------------------------
  // Poll mutations
  // -------------------------------------------------------------------------
  const vote = useMutation(api.polls.vote);
  const closePoll = useMutation(api.polls.close);
  const reopenPoll = useMutation(api.polls.reopen);
  const setPollResultsVisible = useMutation(api.polls.setResultsVisible);
  const removePoll = useMutation(api.polls.remove);

  // -------------------------------------------------------------------------
  // Question mutations
  // -------------------------------------------------------------------------
  const activateQuestion = useMutation(api.hostedQuestions.activate);
  const closeQuestion = useMutation(api.hostedQuestions.close);
  const setQuestionResultsVisible = useMutation(api.hostedQuestions.setResultsVisible);
  const removeQuestion = useMutation(api.hostedQuestions.remove);
  const submitAnswer = useMutation(api.hostedQuestions.submitAnswer);

  // -------------------------------------------------------------------------
  // Local state
  // -------------------------------------------------------------------------
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [selectedPollOption, setSelectedPollOption] = useState<number>(
    activity.source === "poll" ? activity.myVote : -1,
  );
  const [selectedMcqOption, setSelectedMcqOption] = useState<number | null>(
    activity.source === "question" && activity.kind === "question_mcq"
      ? (activity.myAnswer?.mcqIndex ?? null)
      : null,
  );
  const [freeText, setFreeText] = useState<string>(
    activity.source === "question" ? (activity.myAnswer?.freeText ?? "") : "",
  );
  const [questionDeleteDialogOpen, setQuestionDeleteDialogOpen] =
    useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [desmosOpen, setDesmosOpen] = useState(false);
  const [excalidrawOpen, setExcalidrawOpen] = useState(false);

  // -------------------------------------------------------------------------
  // Countdown (question variants only)
  // -------------------------------------------------------------------------
  const timeLimitMs =
    activity.source === "question" ? activity.timeLimitMs : null;
  const startedAt =
    activity.source === "question" ? activity.startedAt : null;
  const remaining = useCountdown(
    startedAt,
    activity.isActive ? timeLimitMs : null,
  );

  const isClosed =
    !activity.isActive || (remaining !== null && remaining === 0);
  const isTimed = !!timeLimitMs;
  const isExpired = isTimed && remaining === 0;

  const serverMcqIndex =
    activity.source === "question" && activity.kind === "question_mcq"
      ? (activity.myAnswer?.mcqIndex ?? null)
      : null;
  const hasMcqAnswer = serverMcqIndex !== null;
  const isMcqDirty =
    activity.kind === "question_mcq" && selectedMcqOption !== serverMcqIndex;

  const serverFreeText =
    activity.source === "question" && activity.kind === "question_frq"
      ? (activity.myAnswer?.freeText ?? "")
      : "";
  const hasFrqAnswer = serverFreeText.trim().length > 0;
  const isFrqDirty =
    activity.kind === "question_frq" && freeText !== serverFreeText;

  // Auto-close question on timer expiry (best-effort)
  useEffect(() => {
    if (
      remaining === 0 &&
      activity.isActive &&
      activity.source === "question" &&
      hostToken
    ) {
      closeQuestion({
        questionId: activity._id as Id<"hostedQuestions">,
        hostToken,
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  // -------------------------------------------------------------------------
  // Delete confirm auto-reset
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!deleteConfirm) return;
    const t = setTimeout(() => setDeleteConfirm(false), 3000);
    return () => clearTimeout(t);
  }, [deleteConfirm]);

  // -------------------------------------------------------------------------
  // Handlers — poll
  // -------------------------------------------------------------------------
  const handlePollVote = useCallback(
    async (optionIndex: number) => {
      if (!activity.isActive) return;
      await vote({
        pollId: activity._id as Id<"polls">,
        participantId,
        optionIndex,
      }).catch(() => {});
      setSelectedPollOption(optionIndex);
    },
    [activity._id, activity.isActive, participantId, vote],
  );

  const handlePollClose = useCallback(() => {
    closePoll({
      pollId: activity._id as Id<"polls">,
      participantId,
    }).catch(() => {});
  }, [activity._id, closePoll, participantId]);

  const handlePollReopen = useCallback(() => {
    reopenPoll({
      pollId: activity._id as Id<"polls">,
      participantId,
    }).catch(() => {});
  }, [activity._id, participantId, reopenPoll]);

  const handlePollReveal = useCallback(() => {
    setPollResultsVisible({
      pollId: activity._id as Id<"polls">,
      participantId,
      visible: !activity.resultsVisible,
    }).catch(() => {});
  }, [activity._id, activity.resultsVisible, participantId, setPollResultsVisible]);

  const handlePollDelete = useCallback(() => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    removePoll({
      pollId: activity._id as Id<"polls">,
      participantId,
    }).catch(() => {});
  }, [activity._id, deleteConfirm, participantId, removePoll]);

  // -------------------------------------------------------------------------
  // Handlers — question
  // -------------------------------------------------------------------------
  const handleQuestionClose = useCallback(() => {
    if (!hostToken) return;
    closeQuestion({
      questionId: activity._id as Id<"hostedQuestions">,
      hostToken,
    }).catch(() => {});
  }, [activity._id, closeQuestion, hostToken]);

  const handleQuestionActivate = useCallback(() => {
    if (!hostToken) return;
    activateQuestion({
      questionId: activity._id as Id<"hostedQuestions">,
      hostToken,
    }).catch(() => {});
  }, [activity._id, activateQuestion, hostToken]);

  const handleQuestionReveal = useCallback(() => {
    if (!hostToken) return;
    setQuestionResultsVisible({
      questionId: activity._id as Id<"hostedQuestions">,
      hostToken,
      visible: !activity.resultsVisible,
    }).catch(() => {});
  }, [activity._id, activity.resultsVisible, hostToken, setQuestionResultsVisible]);

  const handleQuestionDelete = useCallback(() => {
    if (!hostToken) return;
    setQuestionDeleteDialogOpen(true);
  }, [hostToken]);

  const handleConfirmQuestionDelete = useCallback(async () => {
    if (!hostToken || deletingQuestion) return;
    setDeletingQuestion(true);
    try {
      await removeQuestion({
        questionId: activity._id as Id<"hostedQuestions">,
        hostToken,
      });
      setQuestionDeleteDialogOpen(false);
    } finally {
      setDeletingQuestion(false);
    }
  }, [activity._id, deletingQuestion, hostToken, removeQuestion]);

  const handleSubmitAnswer = useCallback(async () => {
    if (submitting || isClosed) return;
    if (activity.source !== "question") return;

    if (activity.kind === "question_mcq" && selectedMcqOption === null) return;
    if (activity.kind === "question_frq" && freeText.trim().length === 0) return;

    setSubmitting(true);
    try {
      await submitAnswer({
        questionId: activity._id as Id<"hostedQuestions">,
        participantId,
        mcqIndex:
          activity.kind === "question_mcq" && selectedMcqOption !== null
            ? selectedMcqOption
            : undefined,
        freeText:
          activity.kind === "question_frq" ? freeText.trim() : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    isClosed,
    activity,
    participantId,
    selectedMcqOption,
    freeText,
    submitAnswer,
  ]);

  // -------------------------------------------------------------------------
  // Host action buttons
  // -------------------------------------------------------------------------
  const hostActions = isHost && (
    <div className="flex items-center gap-1 shrink-0">
      {activity.source === "poll" ? (
        <>
          {activity.isActive ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Close poll"
              onClick={handlePollClose}
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Reopen poll"
              onClick={handlePollReopen}
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title={activity.resultsVisible ? "Hide results" : "Reveal results"}
            onClick={handlePollReveal}
          >
            {activity.resultsVisible ? (
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
            title={
              deleteConfirm ? "Click again to confirm delete" : "Delete"
            }
            onClick={handlePollDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        <>
          {activity.isActive && !isExpired ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Close question"
              onClick={handleQuestionClose}
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Re-activate question"
              onClick={handleQuestionActivate}
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title={activity.resultsVisible ? "Hide results" : "Reveal results"}
            onClick={handleQuestionReveal}
          >
            {activity.resultsVisible ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            title="Delete question"
            onClick={handleQuestionDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );

  const questionDeleteDialog = isHost && activity.source === "question" && (
    <AlertDialog
      open={questionDeleteDialogOpen}
      onOpenChange={setQuestionDeleteDialogOpen}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete question?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The activity and all submitted
            answers will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletingQuestion}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmQuestionDelete}
            disabled={deletingQuestion}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {deletingQuestion ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // -------------------------------------------------------------------------
  // Student scratch-pad toolbar (question types only)
  // -------------------------------------------------------------------------
  const scratchpadToolbar = !isHost && activity.source === "question" && (
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
  );

  // -------------------------------------------------------------------------
  // Status badge (Live / Closed)
  // -------------------------------------------------------------------------
  const statusBadge = (() => {
    const live =
      activity.source === "poll"
        ? activity.isActive
        : activity.isActive && !isExpired;
    if (live) {
      return (
        <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700 dark:bg-green-900/40 dark:text-green-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
          Live
        </span>
      );
    }
    if (!activity.isActive || isExpired) {
      return (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Closed
        </span>
      );
    }
    return null;
  })();

  // -------------------------------------------------------------------------
  // Render: Poll MCQ
  // -------------------------------------------------------------------------
  if (activity.kind === "poll_mcq") {
    const { options, voteCounts, totalVotes } = activity;
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-3 space-y-2.5 text-sm",
          !activity.isActive && "opacity-70",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <KindBadge activity={activity} />
            {statusBadge}
          </div>
          {hostActions}
        </div>

        <p className="font-medium leading-snug">{activity.prompt}</p>

        {/* Voting options */}
        <div className="space-y-1.5">
          {options.map((opt, idx) => {
            const isSelected = selectedPollOption === idx;
            const count = voteCounts?.[idx] ?? 0;
            const pct =
              activity.resultsVisible && totalVotes > 0
                ? Math.round((count / totalVotes) * 100)
                : null;

            return (
              <button
                key={idx}
                type="button"
                disabled={!activity.isActive}
                onClick={() => !isHost && handlePollVote(idx)}
                className={cn(
                  "relative w-full rounded-md border px-3 py-2 text-left text-xs font-medium transition-colors overflow-hidden",
                  isSelected ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
                  !activity.isActive && "cursor-default",
                  isHost && "cursor-default",
                )}
              >
                {pct !== null && (
                  <span
                    className="absolute inset-y-0 left-0 rounded-md bg-primary opacity-20"
                    style={{ width: `${pct}%` }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {OPTION_LABELS[idx]}
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

        {isHost && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Poll Confidence
  // -------------------------------------------------------------------------
  if (activity.kind === "poll_confidence") {
    const { voteCounts, totalVotes } = activity;
    const stars = [1, 2, 3, 4, 5];

    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-3 space-y-2.5 text-sm",
          !activity.isActive && "opacity-70",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <KindBadge activity={activity} />
            {statusBadge}
          </div>
          {hostActions}
        </div>

        <p className="font-medium leading-snug">{activity.prompt}</p>

        {/* Star rating */}
        {!isHost && (
          <div className="flex items-center gap-1">
            {stars.map((s) => {
              const idx = s - 1;
              const active = selectedPollOption >= idx;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={!activity.isActive}
                  onClick={() => handlePollVote(idx)}
                  className="p-0.5 transition-colors disabled:cursor-default"
                >
                  <Star
                    className={cn(
                      "h-6 w-6 transition-colors",
                      active
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground",
                    )}
                  />
                </button>
              );
            })}
            {selectedPollOption >= 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                {selectedPollOption + 1} / 5
              </span>
            )}
          </div>
        )}

        {/* Results bar chart (host or when revealed) */}
        {activity.resultsVisible && voteCounts && (
          <div className="space-y-1">
            {stars.map((s) => {
              const idx = s - 1;
              const count = voteCounts[idx] ?? 0;
              const pct =
                totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              return (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className="w-5 shrink-0 text-center text-muted-foreground">
                    {s}★
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-muted-foreground">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}

        {isHost && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Question MCQ
  // -------------------------------------------------------------------------
  if (activity.kind === "question_mcq") {
    const { options, correctIndex, answerCount, answers } = activity;

    // MCQ distribution for host view or student results view
    const distribution: number[] = options.map((_, i) =>
      (answers ?? []).filter((a) => a.mcqIndex === i).length,
    );
    const maxCount = Math.max(...distribution, 1);

    return (
      <>
        <div
          className={cn(
            "rounded-lg border border-border bg-card p-3 space-y-2.5 text-sm",
            isClosed && !isHost && "opacity-80",
            !activity.isActive && isHost && "opacity-70",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <KindBadge activity={activity} />
              {statusBadge}
            </div>
            {isHost ? hostActions : scratchpadToolbar}
          </div>

          <p className="font-medium leading-snug">{activity.prompt}</p>

          {/* Timer bar */}
          {isTimed && activity.isActive && remaining !== null && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {isExpired ? "Time up" : formatMs(remaining)}
                </span>
                <span>
                  {Math.round((remaining / (timeLimitMs ?? 1)) * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    remaining / (timeLimitMs ?? 1) < 0.2
                      ? "bg-red-500"
                      : "bg-primary",
                  )}
                  style={{
                    width: `${(remaining / (timeLimitMs ?? 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Host view: results breakdown (only after reveal) */}
          {isHost && (
            <div className="space-y-1.5">
              {activity.resultsVisible ? (
                options.map((opt, idx) => {
                  const count = distribution[idx] ?? 0;
                  const pct =
                    answerCount > 0
                      ? Math.round((count / answerCount) * 100)
                      : 0;
                  const isCorrect = correctIndex === idx;
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
                            {isCorrect ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              OPTION_LABELS[idx]
                            )}
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
                })
              ) : (
                <div className="rounded-md border border-dashed border-border bg-muted/30 px-2.5 py-2 text-xs text-muted-foreground">
                  Results are hidden until revealed.
                </div>
              )}

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {answerCount} response{answerCount !== 1 ? "s" : ""}
              </div>
            </div>
          )}

          {/* Student view: option buttons */}
          {!isHost && (
            <div className="space-y-1.5">
              {options.map((opt, idx) => {
                const isSelected = selectedMcqOption === idx;
                const isCorrect =
                  activity.resultsVisible && correctIndex === idx;
                const isMyAnswer = activity.myAnswer?.mcqIndex === idx;
                const count = (answers ?? []).filter(
                  (a) => a.mcqIndex === idx,
                ).length;
                const pct =
                  activity.resultsVisible && answerCount > 0
                    ? Math.round((count / answerCount) * 100)
                    : null;

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isClosed}
                    onClick={() =>
                      !isClosed && setSelectedMcqOption(idx)
                    }
                    className={cn(
                      "relative w-full rounded-md border px-3 py-2 text-left text-xs font-medium transition-colors overflow-hidden",
                      isCorrect
                        ? "border-green-500 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200"
                        : isSelected || isMyAnswer
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted",
                      isClosed && "cursor-default",
                    )}
                  >
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
                          OPTION_LABELS[idx]
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

          {/* Student submit button */}
          {!isHost && !isClosed && (
            <Button
              size="sm"
              className="w-full h-8 text-xs"
              disabled={
                submitting ||
                selectedMcqOption === null ||
                (hasMcqAnswer && !isMcqDirty)
              }
              onClick={handleSubmitAnswer}
            >
              {submitting
                ? "Saving..."
                : !hasMcqAnswer
                  ? "Submit"
                  : isMcqDirty
                    ? "Update answer"
                    : "Saved"}
            </Button>
          )}

          {!isHost && !isClosed && (
            <p className="text-center text-xs text-muted-foreground">
              You can edit your response until this activity closes.
            </p>
          )}
        </div>

        <DesmosModal open={desmosOpen} onClose={() => setDesmosOpen(false)} />
        <ExcalidrawModal
          open={excalidrawOpen}
          onClose={() => setExcalidrawOpen(false)}
        />
        {questionDeleteDialog}
      </>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Question FRQ
  // -------------------------------------------------------------------------
  if (activity.kind === "question_frq") {
    const { answerCount, answers } = activity;

    return (
      <>
        <div
          className={cn(
            "rounded-lg border border-border bg-card p-3 space-y-2.5 text-sm",
            isClosed && !isHost && "opacity-80",
            !activity.isActive && isHost && "opacity-70",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <KindBadge activity={activity} />
              {statusBadge}
            </div>
            {isHost ? hostActions : scratchpadToolbar}
          </div>

          <p className="font-medium leading-snug">{activity.prompt}</p>

          {/* Timer bar */}
          {isTimed && activity.isActive && remaining !== null && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {isExpired ? "Time up" : formatMs(remaining)}
                </span>
                <span>
                  {Math.round((remaining / (timeLimitMs ?? 1)) * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    remaining / (timeLimitMs ?? 1) < 0.2
                      ? "bg-red-500"
                      : "bg-primary",
                  )}
                  style={{
                    width: `${(remaining / (timeLimitMs ?? 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Host: response list (shown after resultsVisible) */}
          {isHost && (
            <>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {answerCount} response{answerCount !== 1 ? "s" : ""}
              </div>
              {activity.resultsVisible &&
                answers !== null &&
                answers.length > 0 && (
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {answers.map((a) => (
                      <div
                        key={a.participantId}
                        className="rounded-md bg-muted px-2.5 py-1.5 text-xs"
                      >
                        {a.freeText || (
                          <span className="italic text-muted-foreground">
                            (empty)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </>
          )}

          {/* Student: textarea */}
          {!isHost && (
            <>
              <Textarea
                value={freeText}
                onChange={(e) =>
                  !isClosed && setFreeText(e.target.value)
                }
                placeholder={
                  isClosed
                    ? "This question is closed."
                    : "Type your answer..."
                }
                rows={3}
                disabled={isClosed}
                className="resize-none text-xs"
              />

              {!isClosed && (
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  disabled={
                    submitting ||
                    freeText.trim().length === 0 ||
                    (hasFrqAnswer && !isFrqDirty)
                  }
                  onClick={handleSubmitAnswer}
                >
                  {submitting
                    ? "Saving..."
                    : !hasFrqAnswer
                      ? "Submit"
                      : isFrqDirty
                        ? "Update answer"
                        : "Saved"}
                </Button>
              )}

              {!isClosed && (
                <p className="text-center text-xs text-muted-foreground">
                  You can edit your response until this activity closes.
                </p>
              )}
            </>
          )}
        </div>

        <DesmosModal open={desmosOpen} onClose={() => setDesmosOpen(false)} />
        <ExcalidrawModal
          open={excalidrawOpen}
          onClose={() => setExcalidrawOpen(false)}
        />
        {questionDeleteDialog}
      </>
    );
  }

  return null;
}
