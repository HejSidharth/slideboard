"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ParticipantChatPanel } from "@/components/chat/participant-chat-panel";
import { PollPanel } from "@/components/polls/poll-panel";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { usePollNotifications } from "@/hooks/use-poll-notifications";
import { useChatNotifications } from "@/hooks/use-chat-notifications";
import { useAnonymousIdentity } from "@/hooks/use-anonymous-identity";
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
    <JoinPageInner
      presentationId={presentationId}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    />
  );
}

function JoinPageInner({
  presentationId,
  activeTab,
  setActiveTab,
}: {
  presentationId: string;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}) {
  // Always subscribe to notifications regardless of active tab
  const { participantId } = useAnonymousIdentity();
  usePollNotifications(presentationId);
  useChatNotifications(presentationId, participantId, true);

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      {/* Header — sticky so it's always visible on mobile */}
      <header className="sticky top-0 z-10 shrink-0 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            className="text-sm font-medium tracking-tight transition-opacity hover:opacity-70"
          >
            SlideBoard
          </Link>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1">
            <Button
              variant={activeTab === "chat" ? "default" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => setActiveTab("chat")}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </Button>
            <Button
              variant={activeTab === "polls" ? "default" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => setActiveTab("polls")}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Polls
            </Button>
          </div>

          <AnimatedThemeToggler />
        </div>
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
            isHost={false}
          />
        )}
      </div>
    </div>
  );
}
