"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ActivityPanel } from "@/components/activities/activity-panel";
import { QuestionPanel } from "@/components/questions/question-panel";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { useActivityNotifications } from "@/hooks/use-activity-notifications";
import { useAnonymousIdentity } from "@/hooks/use-anonymous-identity";
import { LayoutList, HelpCircle, MessageSquareOff } from "lucide-react";

type Tab = "activities" | "questions";

export default function JoinPage() {
  const params = useParams();
  const presentationId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>("activities");

  const hasConvex = !!process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!hasConvex) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="mx-auto max-w-sm px-6 text-center">
          <MessageSquareOff className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
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
  useAnonymousIdentity();
  useActivityNotifications(presentationId);

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 shrink-0 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-2">
          <Link
            href="/"
            className="text-sm font-medium tracking-tight transition-opacity hover:opacity-70"
          >
            SlideBoard
          </Link>

          {/* Tab switcher — mobile only */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1 lg:hidden">
            <Button
              variant={activeTab === "activities" ? "default" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => setActiveTab("activities")}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Activities
            </Button>
            <Button
              variant={activeTab === "questions" ? "default" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => setActiveTab("questions")}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Q&amp;A
            </Button>
          </div>

          <AnimatedThemeToggler />
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto flex w-full max-w-5xl flex-1 overflow-hidden">

        {/* Mobile: single tabbed panel */}
        <div className="flex h-full w-full flex-col lg:hidden">
          {activeTab === "activities" ? (
            <ActivityPanel
              presentationId={presentationId}
              isHost={false}
              className="h-full"
            />
          ) : (
            <QuestionPanel
              presentationId={presentationId}
              className="h-full"
            />
          )}
        </div>

        {/* Desktop: two-column layout — Activities 2/3 | Q&A 1/3 */}
        <div className="hidden h-full w-full lg:flex lg:flex-row">
          <div className="h-full flex-[2] overflow-hidden border-r border-border">
            <ActivityPanel
              presentationId={presentationId}
              isHost={false}
              className="h-full"
            />
          </div>
          <div className="h-full flex-1 overflow-hidden">
            <QuestionPanel
              presentationId={presentationId}
              className="h-full"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
