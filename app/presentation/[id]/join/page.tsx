"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ParticipantChatPanel } from "@/components/chat/participant-chat-panel";
import { PollPanel } from "@/components/polls/poll-panel";
import { MessageCircle, BarChart3 } from "lucide-react";

type Tab = "chat" | "polls";

export default function JoinPage() {
  const params = useParams();
  const presentationId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>("chat");

  const hasConvex = !!process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!hasConvex) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="mx-auto max-w-sm px-6 text-center">
          <MessageCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="mb-2 text-xl font-semibold">Not Available</h1>
          <p className="text-sm text-muted-foreground">
            Real-time features are not configured for this presentation.
            Ask the presenter to set up Convex.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <span className="text-xs font-bold text-primary-foreground">S</span>
          </div>
          <span className="text-sm font-medium tracking-tight">SlideBoard</span>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1">
          <Button
            variant={activeTab === "chat" ? "default" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 px-3 text-xs"
            onClick={() => setActiveTab("chat")}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Chat
          </Button>
          <Button
            variant={activeTab === "polls" ? "default" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 px-3 text-xs"
            onClick={() => setActiveTab("polls")}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Polls
          </Button>
        </div>

        <div className="w-[72px]" /> {/* Spacer for centering */}
      </header>

      {/* Panel */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "chat" ? (
          <ParticipantChatPanel
            presentationId={presentationId}
            className="h-full"
          />
        ) : (
          <PollPanel
            presentationId={presentationId}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
}
