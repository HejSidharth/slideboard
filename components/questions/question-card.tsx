"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, ChevronUp, Circle, EyeOff, Eye, Trash2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export interface QuestionData {
  _id: Id<"questions">;
  presentationId: string;
  text: string;
  askedBy: string;
  upvotes: number;
  isAnswered: boolean;
  isHidden: boolean;
  createdAt: number;
  myUpvote: boolean;
  isHost: boolean;
}

interface QuestionCardProps {
  question: QuestionData;
  participantId: string;
  /** Only provided on host surfaces — enables host-only actions. */
  hostToken?: string;
}

export function QuestionCard({
  question,
  participantId,
  hostToken,
}: QuestionCardProps) {
  const toggleUpvote = useMutation(api.questions.toggleUpvote);
  const markAnswered = useMutation(api.questions.markAnswered);
  const setHidden = useMutation(api.questions.setHidden);
  const remove = useMutation(api.questions.remove);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOwnQuestion = question.askedBy === participantId;
  const canUpvote = !isOwnQuestion && !question.isAnswered;
  const showHostActions = Boolean(hostToken);

  const handleUpvote = useCallback(() => {
    if (!canUpvote) return;
    toggleUpvote({ questionId: question._id, voterId: participantId });
  }, [canUpvote, toggleUpvote, question._id, participantId]);

  const handleToggleAnswered = useCallback(() => {
    if (!hostToken) return;
    markAnswered({
      questionId: question._id,
      hostToken,
      answered: !question.isAnswered,
    });
  }, [hostToken, markAnswered, question._id, question.isAnswered]);

  const handleToggleHidden = useCallback(() => {
    if (!hostToken) return;
    setHidden({
      questionId: question._id,
      hostToken,
      hidden: !question.isHidden,
    });
  }, [hostToken, setHidden, question._id, question.isHidden]);

  const handleRemove = useCallback(() => {
    if (!hostToken) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    remove({ questionId: question._id, hostToken });
  }, [hostToken, remove, question._id, confirmDelete]);

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3 transition-opacity",
        question.isAnswered && "opacity-60",
        question.isHidden && "border-dashed opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Upvote column */}
        <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
          <button
            type="button"
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-md px-1.5 py-1 text-xs transition-colors",
              canUpvote
                ? question.myUpvote
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
                : "cursor-default text-muted-foreground/40"
            )}
            onClick={handleUpvote}
            disabled={!canUpvote}
            title={
              isOwnQuestion
                ? "You cannot upvote your own question"
                : question.myUpvote
                  ? "Remove upvote"
                  : "Upvote this question"
            }
          >
            <ChevronUp
              className={cn(
                "h-4 w-4",
                question.myUpvote && "fill-current"
              )}
            />
            <span className="font-medium leading-none">{question.upvotes}</span>
          </button>
        </div>

        {/* Question body */}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm leading-snug",
              question.isAnswered && "line-through decoration-muted-foreground/50"
            )}
          >
            {question.text}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {question.isAnswered && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Answered
              </span>
            )}
            {question.isHidden && showHostActions && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <EyeOff className="h-3 w-3" />
                Hidden from students
              </span>
            )}
            {isOwnQuestion && (
              <span className="text-[11px] text-muted-foreground">Your question</span>
            )}
          </div>
        </div>

        {/* Host actions */}
        {showHostActions && (
          <div className="flex shrink-0 items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-6 w-6",
                    question.isAnswered && "text-emerald-500"
                  )}
                  onClick={handleToggleAnswered}
                >
                  {question.isAnswered ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {question.isAnswered ? "Unmark as answered" : "Mark as answered"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleToggleHidden}
                >
                  {question.isHidden ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {question.isHidden ? "Show to students" : "Hide from students"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-6 w-6",
                    confirmDelete
                      ? "text-destructive"
                      : "text-muted-foreground hover:text-destructive"
                  )}
                  onClick={handleRemove}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {confirmDelete ? "Click again to confirm delete" : "Delete question"}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}
