"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { nanoid } from "nanoid";
import { api } from "@/convex/_generated/api";
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
import { Plus, X } from "lucide-react";

interface CreatePollDialogProps {
  presentationId: string;
  participantId: string;
}

export function CreatePollDialog({
  presentationId,
  participantId,
}: CreatePollDialogProps) {
  const [open, setOpen] = useState(false);
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

  const handleSubmit = useCallback(() => {
    const trimmedQuestion = question.trim();
    const validOptions = options.map((o) => o.trim()).filter(Boolean);

    if (!trimmedQuestion || validOptions.length < 2) return;

    createPoll({
      presentationId,
      question: trimmedQuestion,
      options: validOptions,
      createdBy: participantId,
      clientRequestId: nanoid(),
    });

    setQuestion("");
    setOptions(["", ""]);
    setOpen(false);
  }, [question, options, createPoll, presentationId, participantId]);

  const canSubmit =
    question.trim().length > 0 &&
    options.filter((o) => o.trim().length > 0).length >= 2;

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
            Ask a question and add options for participants to vote on.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 text-xs"
              onClick={handleUseQuizPreset}
            >
              Use quiz preset (A/B/C/D)
            </Button>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Question
            </label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What do you think about...?"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Options
            </label>
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
