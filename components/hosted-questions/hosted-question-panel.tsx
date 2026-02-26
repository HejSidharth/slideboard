"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonymousIdentity } from "@/hooks/use-anonymous-identity";
import { HostedQuestionCard } from "./hosted-question-card";
import { CreateQuestionDialog } from "./create-question-dialog";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HostedQuestionData } from "@/types";

interface HostedQuestionPanelProps {
  presentationId: string;
  hostToken: string;
  className?: string;
}

export function HostedQuestionPanel({
  presentationId,
  hostToken,
  className,
}: HostedQuestionPanelProps) {
  const { participantId } = useAnonymousIdentity();
  const [dialogOpen, setDialogOpen] = useState(false);

  const questions = useQuery(api.hostedQuestions.list, {
    presentationId,
    participantId,
    hostToken,
  }) as HostedQuestionData[] | undefined;

  return (
    <aside className={className}>
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium tracking-tight">Questions</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="New question"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Create MCQ and free-response questions for participants.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!questions || questions.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-muted-foreground">
                <ClipboardList className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p className="text-sm">No questions yet.</p>
                <p className="mt-1 text-xs opacity-70">
                  Create a question to collect responses.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q: HostedQuestionData) => (
                <HostedQuestionCard key={q._id} question={q} hostToken={hostToken} />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateQuestionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        presentationId={presentationId}
        hostToken={hostToken}
      />
    </aside>
  );
}
