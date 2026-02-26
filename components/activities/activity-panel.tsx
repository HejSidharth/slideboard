"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonymousIdentity } from "@/hooks/use-anonymous-identity";
import { Button } from "@/components/ui/button";
import { ActivityCard } from "./activity-card";
import { CreateActivityDialog } from "./create-activity-dialog";
import { Plus, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  presentationId: string;
  isHost: boolean;
  /** Required when isHost is true */
  hostToken?: string;
  className?: string;
}

export function ActivityPanel({
  presentationId,
  isHost,
  hostToken,
  className,
}: Props) {
  const { participantId } = useAnonymousIdentity();
  const [createOpen, setCreateOpen] = useState(false);

  const activities = useQuery(api.activities.list, {
    presentationId,
    participantId,
    hostToken: isHost ? hostToken : undefined,
  });

  return (
    <div className={cn("flex flex-col overflow-hidden", className)}>
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <LayoutList className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Activities</span>
          {activities && activities.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {activities.length}
            </span>
          )}
        </div>
        {isHost && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        )}
      </div>

      {/* Activity list */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {activities === undefined ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <LayoutList className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {isHost
                ? "No activities yet. Create one to get started."
                : "No activities yet."}
            </p>
            {isHost && (
              <Button
                size="sm"
                variant="outline"
                className="mt-1 h-7 gap-1.5 px-3 text-xs"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Create activity
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <ActivityCard
                key={activity._id}
                activity={activity}
                isHost={isHost}
                hostToken={hostToken}
                participantId={participantId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      {isHost && hostToken && (
        <CreateActivityDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          presentationId={presentationId}
          participantId={participantId}
          hostToken={hostToken}
        />
      )}
    </div>
  );
}
