"use client";

import React from "react";
import { ExternalLink, Frame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getProviderLabel } from "@/lib/activity-embeds";
import type { EmbedProvider, EmbedSlideData } from "@/types";

interface ActivityEmbedSlideProps {
  slide: EmbedSlideData;
  className?: string;
  previewOnly?: boolean;
  compact?: boolean;
}

const providerClasses: Record<EmbedProvider, string> = {
  generic: "border-primary/20 bg-primary/8 text-primary",
  kahoot: "border-fuchsia-500/25 bg-fuchsia-500/8 text-fuchsia-700 dark:text-fuchsia-300",
  gimkit: "border-sky-500/25 bg-sky-500/8 text-sky-700 dark:text-sky-300",
  quizizz: "border-amber-500/25 bg-amber-500/8 text-amber-700 dark:text-amber-300",
  youtube: "border-rose-500/25 bg-rose-500/8 text-rose-700 dark:text-rose-300",
};

export const ActivityEmbedSlide = React.forwardRef<HTMLDivElement, ActivityEmbedSlideProps>(
  function ActivityEmbedSlide(
    { slide, className, previewOnly = false, compact = false },
    ref,
  ) {
    const providerLabel = getProviderLabel(slide.provider);
    const showIframe =
      !previewOnly && slide.renderMode === "embed" && typeof slide.embedUrl === "string";

    if (showIframe) {
      return (
        <div
          ref={ref}
          className={cn(
            "flex h-full w-full flex-col overflow-hidden bg-background",
            className,
          )}
        >
          <div className="flex items-center justify-between border-b border-border bg-background/95 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  providerClasses[slide.provider],
                )}
              >
                {providerLabel}
              </span>
              <span className="text-sm font-medium text-foreground">{slide.title}</span>
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
              <a href={slide.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </a>
            </Button>
          </div>
          <iframe
            title={slide.title}
            src={slide.embedUrl ?? slide.url}
            className="h-full w-full bg-white"
            allow="clipboard-write; fullscreen"
          />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex h-full w-full items-center justify-center bg-background p-4 md:p-8",
          className,
        )}
      >
        <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                providerClasses[slide.provider],
              )}
            >
              {providerLabel}
            </span>
            <span className="text-xs text-muted-foreground">Embedded activity</span>
          </div>

          <div className={cn("mt-4", compact ? "space-y-2" : "space-y-3")}>
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-border bg-secondary p-3 text-primary">
                <Frame className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className={cn("font-semibold tracking-tight text-foreground", compact ? "text-base" : "text-2xl")}>
                  {slide.title}
                </h3>
                <p className={cn("mt-1 text-muted-foreground", compact ? "text-xs" : "text-sm")}>
                  {slide.renderMode === "embed" && !previewOnly
                    ? "Open this activity in a new tab if the provider blocks embedding in your browser."
                    : "This provider link is available as a clean launch card here. Open it to start or join the activity."}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
              <span className="line-clamp-2 break-all">{slide.url}</span>
            </div>

            <div className="flex gap-2">
              <Button className="gap-2" asChild>
                <a href={slide.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open activity
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
