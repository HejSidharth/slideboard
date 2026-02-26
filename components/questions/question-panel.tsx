"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QuestionCard } from "./question-card";
import { HelpCircle, Send } from "lucide-react";
import { useAnonymousIdentity } from "@/hooks/use-anonymous-identity";

interface QuestionPanelProps {
  presentationId: string;
  className?: string;
  /**
   * When provided this is a host surface — the token enables host-only
   * actions (mark answered, hide, delete) on each question card.
   */
  hostToken?: string;
}

export function QuestionPanel({
  presentationId,
  className,
  hostToken,
}: QuestionPanelProps) {
  const { participantId } = useAnonymousIdentity();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const questions = useQuery(api.questions.list, {
    presentationId,
    participantId,
    hostToken,
  });

  const ask = useMutation(api.questions.ask);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await ask({ presentationId, text: trimmed, askedBy: participantId });
      setText("");
    } finally {
      setSubmitting(false);
    }
  }, [text, submitting, ask, presentationId, participantId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // Scroll to bottom when new questions appear (if already near bottom)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [questions?.length]);

  const isHost = Boolean(hostToken);

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Q&amp;A</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isHost
                ? "Student questions, ranked by upvotes."
                : "Ask anonymously. Upvote questions you share."}
            </p>
          </div>
          {questions && questions.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {questions.filter((q) => !q.isAnswered).length} open
            </span>
          )}
        </div>
      </div>

      {/* Questions list */}
      <div className="flex-1 overflow-y-auto">
        {!questions ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : questions.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <HelpCircle className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No questions yet</p>
            <p className="text-xs text-muted-foreground/70">
              {isHost
                ? "Students can ask questions anonymously."
                : "Be the first to ask a question."}
            </p>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {questions.map((question) => (
              <QuestionCard
                key={question._id}
                question={question}
                participantId={participantId}
                hostToken={hostToken}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Ask input */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="relative">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question anonymously…"
            className="min-h-[72px] resize-none pr-12 text-sm"
            maxLength={500}
          />
          <Button
            size="icon-sm"
            className="absolute right-1.5 bottom-1.5"
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1 text-right text-[10px] text-muted-foreground">
          {text.length}/500 · Enter to send
        </p>
      </div>
    </div>
  );
}
