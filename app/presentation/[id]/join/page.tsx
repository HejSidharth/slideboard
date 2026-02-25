"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
// import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { PollPanel } from "@/components/polls/poll-panel";
import { QuestionPanel } from "@/components/questions/question-panel";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { usePollNotifications } from "@/hooks/use-poll-notifications";
import { useAnonymousIdentity } from "@/hooks/use-anonymous-identity";
// import { useLiveSlideView } from "@/hooks/use-live-slide-view";
// import { usePresentationStore } from "@/store/use-presentation-store";
// import type { ExcalidrawElement, StoreSnapshot, TLRecord } from "@/types";
import { BarChart3, HelpCircle, MessageSquareOff /*, Monitor */ } from "lucide-react";

// const TldrawWrapper = dynamic(
//   () => import("@/components/editor/tldraw-wrapper"),
//   {
//     ssr: false,
//     loading: () => (
//       <div className="flex h-full w-full items-center justify-center bg-background">
//         <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
//       </div>
//     ),
//   },
// );

// const ExcalidrawWrapper = dynamic(
//   () => import("@/components/editor/excalidraw-wrapper"),
//   {
//     ssr: false,
//     loading: () => (
//       <div className="flex h-full w-full items-center justify-center bg-background">
//         <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
//       </div>
//     ),
//   },
// );

type Tab = "polls" | "questions"; // | "live"

export default function JoinPage() {
  const params = useParams();
  const presentationId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>("polls");

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
  usePollNotifications(presentationId);

  // Live canvas state — disabled until LIVE_VIEW_ENABLED is re-enabled
  // const { liveSlideIndex, liveEngine, liveSnapshotJson, isLive } = useLiveSlideView(presentationId);

  // Auto-follow the presenter's slide (sync to local Zustand store)
  // const setCurrentSlide = usePresentationStore((s) => s.setCurrentSlide);
  // const prevLiveSlideIndexRef = useRef<number | null>(null);
  // useEffect(() => {
  //   if (liveSlideIndex === null) return;
  //   if (liveSlideIndex === prevLiveSlideIndexRef.current) return;
  //   prevLiveSlideIndexRef.current = liveSlideIndex;
  //   setCurrentSlide(presentationId, liveSlideIndex);
  // }, [liveSlideIndex, presentationId, setCurrentSlide]);

  // Parse live snapshot / elements for canvas wrappers
  // const parseLiveSnapshot = useCallback((): StoreSnapshot<TLRecord> | null => {
  //   if (!liveSnapshotJson) return null;
  //   try { return JSON.parse(liveSnapshotJson) as StoreSnapshot<TLRecord>; } catch { return null; }
  // }, [liveSnapshotJson]);

  // const parseLiveElements = useCallback((): readonly ExcalidrawElement[] | null => {
  //   if (!liveSnapshotJson) return null;
  //   try { return JSON.parse(liveSnapshotJson) as readonly ExcalidrawElement[]; } catch { return null; }
  // }, [liveSnapshotJson]);

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
              variant={activeTab === "polls" ? "default" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => setActiveTab("polls")}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Polls
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
            {/* Live tab — re-enable when LIVE_VIEW_ENABLED = true */}
            {/* <Button
              variant={activeTab === "live" ? "default" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => setActiveTab("live")}
            >
              <Monitor className="h-3.5 w-3.5" />
              Live
              {isLive && (
                <span className="ml-1 h-1.5 w-1.5 rounded-full bg-red-500" />
              )}
            </Button> */}
          </div>

          <AnimatedThemeToggler />
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto flex w-full max-w-5xl flex-1 overflow-hidden">

        {/* Mobile: single tabbed panel */}
        <div className="flex h-full w-full flex-col lg:hidden">
          {activeTab === "polls" ? (
            <PollPanel
              presentationId={presentationId}
              className="h-full"
              isHost={false}
            />
          ) : (
            <QuestionPanel
              presentationId={presentationId}
              className="h-full"
            />
          )}
          {/* Live canvas tab — re-enable when LIVE_VIEW_ENABLED = true */}
          {/* activeTab === "live" && (
            <LiveCanvasView
              presentationId={presentationId}
              isLive={isLive}
              liveEngine={liveEngine}
              parseLiveSnapshot={parseLiveSnapshot}
              parseLiveElements={parseLiveElements}
            />
          ) */}
        </div>

        {/* Desktop: two-column layout — Polls left, Q&A right */}
        <div className="hidden h-full w-full lg:flex lg:flex-row">
          <div className="h-full flex-1 overflow-hidden border-r border-border">
            <PollPanel
              presentationId={presentationId}
              className="h-full"
              isHost={false}
            />
          </div>
          <div className="h-full flex-1 overflow-hidden">
            <QuestionPanel
              presentationId={presentationId}
              className="h-full"
            />
          </div>
        </div>

        {/* Desktop with live canvas — re-enable when LIVE_VIEW_ENABLED = true */}
        {/* Three-column layout: Live left 3/5, Polls + Q&A stacked right 2/5
        <div className="hidden h-full w-full lg:flex lg:flex-row">
          <div className="h-full flex-[3] overflow-hidden border-r border-border">
            <LiveCanvasView
              presentationId={presentationId}
              isLive={isLive}
              liveEngine={liveEngine}
              parseLiveSnapshot={parseLiveSnapshot}
              parseLiveElements={parseLiveElements}
            />
          </div>
          <div className="flex h-full flex-[2] flex-col">
            <div className="flex-1 overflow-hidden border-b border-border">
              <PollPanel presentationId={presentationId} className="h-full" isHost={false} />
            </div>
            <div className="flex-1 overflow-hidden">
              <QuestionPanel presentationId={presentationId} className="h-full" />
            </div>
          </div>
        </div> */}

      </div>
    </div>
  );
}

// Live canvas view component — re-enable when LIVE_VIEW_ENABLED = true
// function LiveCanvasView({
//   isLive,
//   liveEngine,
//   parseLiveSnapshot,
//   parseLiveElements,
// }: {
//   presentationId: string;
//   isLive: boolean;
//   liveEngine: "tldraw" | "excalidraw" | null;
//   parseLiveSnapshot: () => StoreSnapshot<TLRecord> | null;
//   parseLiveElements: () => readonly ExcalidrawElement[] | null;
// }) {
//   if (!isLive || !liveEngine) {
//     return (
//       <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
//         <Monitor className="h-10 w-10 opacity-40" />
//         <p className="text-sm">Waiting for presenter to go live&hellip;</p>
//       </div>
//     );
//   }
//   if (liveEngine === "excalidraw") {
//     return (
//       <ExcalidrawWrapper
//         key="live-excalidraw"
//         initialElements={[]}
//         liveElements={parseLiveElements()}
//         isReadonly={true}
//       />
//     );
//   }
//   return (
//     <TldrawWrapper
//       key="live-tldraw"
//       slideId="live"
//       liveSnapshot={parseLiveSnapshot()}
//       isReadonly={true}
//     />
//   );
// }
