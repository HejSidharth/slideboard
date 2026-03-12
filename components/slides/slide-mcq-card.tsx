"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SlideMcqDraft } from "@/types";

interface SlideMcqCardProps {
  draft: SlideMcqDraft;
  className?: string;
  showCorrect?: boolean;
}

const OPTION_LABELS = "ABCDEFGH";

export function SlideMcqCard({
  draft,
  className,
  showCorrect = true,
}: SlideMcqCardProps) {
  return (
    <div className={cn("w-full max-w-md rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur", className)}>
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full border border-primary/20 bg-primary/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          MCQ
        </span>
      </div>

      <p className="text-sm font-medium leading-snug text-foreground">{draft.prompt}</p>

      <div className="mt-3 space-y-2">
        {draft.options.map((option, index) => {
          const isCorrect = showCorrect && draft.correctIndex === index;

          return (
            <div
              key={`${OPTION_LABELS[index]}-${option}`}
              className={cn(
                "flex items-start gap-2 rounded-xl border px-3 py-2 text-sm",
                isCorrect
                  ? "border-primary/30 bg-primary/6"
                  : "border-border bg-background/80",
              )}
            >
              <span className="mt-0.5 text-muted-foreground">
                {isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="mr-1 font-medium text-muted-foreground">
                  {OPTION_LABELS[index]}.
                </span>
                {option}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
