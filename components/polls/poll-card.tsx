"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Eye, EyeOff, Heart, Lock, Trash2, Unlock } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export interface PollData {
  _id: Id<"polls">;
  presentationId: string;
  question: string;
  options: string[];
  createdBy: string;
  isActive: boolean;
  resultsVisible: boolean;
  createdAt: number;
  voteCounts: number[] | null;
  totalVotes: number;
  myVote: number;
  pollLikeCount: number;
  pollLiked: boolean;
}

interface PollCardProps {
  poll: PollData;
  participantId: string;
}

export function PollCard({ poll, participantId }: PollCardProps) {
  const castVote = useMutation(api.polls.vote);
  const closePoll = useMutation(api.polls.close);
  const reopenPoll = useMutation(api.polls.reopen);
  const setResultsVisible = useMutation(api.polls.setResultsVisible);
  const removePoll = useMutation(api.polls.remove);
  const togglePollLike = useMutation(api.polls.togglePollLike);

  const [animatingLike, setAnimatingLike] = useState(false);

  const isCreator = poll.createdBy === participantId;
  const showResults = poll.resultsVisible && Array.isArray(poll.voteCounts);

  const maxVotes = useMemo(
    () => Math.max(...(poll.voteCounts ?? []), 1),
    [poll.voteCounts]
  );

  const handleVote = useCallback(
    (optionIndex: number) => {
      castVote({ pollId: poll._id, participantId, optionIndex });
    },
    [castVote, poll._id, participantId]
  );

  const handleToggleActive = useCallback(() => {
    if (poll.isActive) {
      closePoll({ pollId: poll._id, participantId });
    } else {
      reopenPoll({ pollId: poll._id, participantId });
    }
  }, [poll.isActive, poll._id, participantId, closePoll, reopenPoll]);

  const handleToggleResults = useCallback(() => {
    setResultsVisible({
      pollId: poll._id,
      participantId,
      visible: !poll.resultsVisible,
    });
  }, [setResultsVisible, poll._id, participantId, poll.resultsVisible]);

  const handleRemove = useCallback(() => {
    removePoll({ pollId: poll._id, participantId });
  }, [removePoll, poll._id, participantId]);

  const handleTogglePollLike = useCallback(() => {
    togglePollLike({ pollId: poll._id, participantId });
  }, [togglePollLike, poll._id, participantId]);

  const handleQuestionDoubleClick = useCallback(() => {
    togglePollLike({ pollId: poll._id, participantId });
    setAnimatingLike(true);
    setTimeout(() => setAnimatingLike(false), 600);
  }, [togglePollLike, poll._id, participantId]);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="relative flex-1 min-w-0">
          <h3
            className="text-sm font-medium leading-snug select-none cursor-default"
            onDoubleClick={handleQuestionDoubleClick}
          >
            {poll.question}
          </h3>
          {animatingLike && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Heart className="h-5 w-5 fill-rose-500 text-rose-500 animate-like-pop" />
            </div>
          )}
        </div>
        {isCreator && (
          <div className="flex shrink-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleToggleResults}
                >
                  {poll.resultsVisible ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {poll.resultsVisible ? "Hide results" : "Reveal results"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleToggleActive}
                >
                  {poll.isActive ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    <Unlock className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {poll.isActive ? "Close poll" : "Reopen poll"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={handleRemove}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete poll</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {poll.options.map((option, index) => {
          const count = showResults ? (poll.voteCounts?.[index] ?? 0) : 0;
          const percentage =
            showResults && poll.totalVotes > 0
              ? Math.round((count / poll.totalVotes) * 100)
              : 0;
          const isMyVote = poll.myVote === index;
          const barWidth = showResults && poll.totalVotes > 0
            ? (count / maxVotes) * 100
            : 0;

          return (
            <button
              key={index}
              className={cn(
                "relative w-full overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition-colors",
                poll.isActive ? "cursor-pointer hover:bg-accent" : "cursor-default",
                isMyVote && "border-primary ring-1 ring-primary"
              )}
              onClick={() => {
                if (poll.isActive) handleVote(index);
              }}
              disabled={!poll.isActive}
            >
              {showResults && (
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-md transition-all duration-500",
                    isMyVote ? "bg-primary/15" : "bg-muted-foreground/10"
                  )}
                  style={{ width: `${barWidth}%` }}
                />
              )}

              <div className="relative flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {isMyVote && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                  <span className="truncate">{option}</span>
                </div>
                {showResults && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {count} ({percentage}%)
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {showResults && (
        <div className="mt-3 rounded-md border border-border/70 bg-muted/30 p-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Histogram
          </p>
          <div
            className="mt-2 grid items-end gap-2"
            style={{ gridTemplateColumns: `repeat(${poll.options.length}, minmax(0, 1fr))` }}
          >
            {poll.options.map((option, index) => {
              const count = poll.voteCounts?.[index] ?? 0;
              const heightPercent = maxVotes > 0 ? (count / maxVotes) * 100 : 0;

              return (
                <div key={option + index} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{count}</span>
                  <div className="flex h-14 w-full items-end rounded-sm bg-muted">
                    <div
                      className="w-full rounded-sm bg-primary/70 transition-all duration-500"
                      style={{ height: `${Math.max(heightPercent, count > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                  <span className="max-w-full truncate text-[10px] text-muted-foreground">
                    {option}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
        </span>
        <div className="flex items-center gap-2">
          {/* Poll like button */}
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] transition-colors",
              poll.pollLiked
                ? "text-rose-500"
                : "text-muted-foreground hover:text-rose-400"
            )}
            onClick={handleTogglePollLike}
          >
            <Heart
              className={cn(
                "h-3 w-3",
                poll.pollLiked && "fill-current"
              )}
            />
            {poll.pollLikeCount > 0 && (
              <span>{poll.pollLikeCount}</span>
            )}
          </button>
          {!poll.resultsVisible && (
            <span className="text-xs font-medium text-muted-foreground">
              Results hidden
            </span>
          )}
          {!poll.isActive && (
            <span className="text-xs font-medium text-muted-foreground">
              Closed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
