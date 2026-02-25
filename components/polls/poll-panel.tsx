"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonymousIdentity } from "@/hooks/use-anonymous-identity";
import { PollCard } from "./poll-card";
import type { PollData } from "./poll-card";
import { CreatePollDialog } from "./create-poll-dialog";
import { BarChart3 } from "lucide-react";

interface PollPanelProps {
  presentationId: string;
  className?: string;
}

export function PollPanel({ presentationId, className }: PollPanelProps) {
  const { participantId } = useAnonymousIdentity();
  const polls = useQuery(api.polls.list, {
    presentationId,
    participantId,
  }) as PollData[] | undefined;

  return (
    <aside className={className}>
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium tracking-tight">Polls</h2>
            <CreatePollDialog
              presentationId={presentationId}
              participantId={participantId}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Create polls and vote anonymously in real-time.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!polls || polls.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No polls yet.</p>
                <p className="text-xs mt-1 opacity-70">
                  Create a poll to gather responses.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {polls.map((poll: PollData) => (
                <PollCard
                  key={poll._id}
                  poll={poll}
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
