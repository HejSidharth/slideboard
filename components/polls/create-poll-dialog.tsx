"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { nanoid } from "nanoid";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BarChart3, Plus, Star, X } from "lucide-react";

type PollType = "multiple_choice" | "confidence";

interface CreatePollDialogProps {
  presentationId: string;
  participantId: string;
}

export function CreatePollDialog({
  presentationId,
  participantId,
}: CreatePollDialogProps) {
  const [open, setOpen] = useState(false);
  const [pollType, setPollType] = useState<PollType>("multiple_choice");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const createPoll = useMutation(api.polls.create);

  const handleAddOption = useCallback(() => {
    if (options.length >= 8) return;
    setOptions((prev) => [...prev, ""]);
  }, [options.length]);

  const handleRemoveOption = useCallback((index: number) => {
    setOptions((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleOptionChange = useCallback((index: number, value: string) => {
    setOptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const handleUseQuizPreset = useCallback(() => {
    setQuestion("What is the answer?");
    setOptions(["A", "B", "C", "D"]);
  }, []);

  const handlePollTypeChange = useCallback((type: PollType) => {
    setPollType(type);
    if (type === "confidence") {
      setOptions([]);
    } else {
      setOptions(["", ""]);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    if (pollType === "multiple_choice") {
      const validOptions = options.map((o) => o.trim()).filter(Boolean);
      if (validOptions.length < 2) return;
      createPoll({
        presentationId,
        question: trimmedQuestion,
        options: validOptions,
        pollType: "multiple_choice",
        createdBy: participantId,
        clientRequestId: nanoid(),
      });
    } else {
      createPoll({
        presentationId,
        question: trimmedQuestion,
        options: [],
        pollType: "confidence",
        createdBy: participantId,
        clientRequestId: nanoid(),
      });
    }

    setQuestion("");
    setOptions(["", ""]);
    setPollType("multiple_choice");
    setOpen(false);
  }, [question, options, pollType, createPoll, presentationId, participantId]);

  const canSubmit =
    question.trim().length > 0 &&
    (pollType === "confidence" ||
      options.filter((o) => o.trim().length > 0).length >= 2);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Create Poll
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a Poll</DialogTitle>
          <DialogDescription>
            {pollType === "confidence"
              ? "Ask students to rate their confidence on a 1–5 star scale."
              : "Ask a question and add options for participants to vote on."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Poll type selector */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1">
            <button
              type="button"
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                pollType === "multiple_choice"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => handlePollTypeChange("multiple_choice")}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Multiple Choice
            </button>
            <button
              type="button"
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                pollType === "confidence"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => handlePollTypeChange("confidence")}
            >
              <Star className="h-3.5 w-3.5" />
              Confidence Check
            </button>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Question
            </label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                pollType === "confidence"
                  ? "How confident are you about this topic?"
                  : "What do you think about...?"
              }
              autoFocus
            />
          </div>

          {pollType === "multiple_choice" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Options</label>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleUseQuizPreset}
                >
                  A/B/C/D preset
                </Button>
              </div>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (index === options.length - 1 && options.length < 8) {
                            handleAddOption();
                          }
                        }
                      }}
                    />
                    {options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-9 w-9"
                        onClick={() => handleRemoveOption(index)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {options.length < 8 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={handleAddOption}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add option
                </Button>
              )}
            </div>
          )}

          {pollType === "confidence" && (
            <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="h-6 w-6 fill-amber-400/40 text-amber-400/40"
                />
              ))}
              <span className="ml-2 text-xs text-muted-foreground">
                Students rate 1–5 stars
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Create Poll
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
