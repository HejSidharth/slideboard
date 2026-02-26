"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonymousIdentity } from "@/hooks/use-anonymous-identity";
import { StudentQuestionCard } from "./student-question-card";
import { ClipboardList } from "lucide-react";
import type { HostedQuestionData } from "@/types";

interface StudentQuestionPanelProps {
  presentationId: string;
  className?: string;
}

export function StudentQuestionPanel({
  presentationId,
  className,
}: StudentQuestionPanelProps) {
  const { participantId } = useAnonymousIdentity();

  const questions = useQuery(api.hostedQuestions.list, {
    presentationId,
    participantId,
  }) as HostedQuestionData[] | undefined;

  return (
    <aside className={className}>
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b border-border p-4">
          <h2 className="text-sm font-medium tracking-tight">Questions</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Answer questions from the presenter.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!questions || questions.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-muted-foreground">
                <ClipboardList className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p className="text-sm">No questions yet.</p>
                <p className="mt-1 text-xs opacity-70">
                  Waiting for the presenter to create a question.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q: HostedQuestionData) => (
                <StudentQuestionCard
                  key={q._id}
                  question={q}
                  participantId={participantId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
