"use client";

import { PresentationList } from "@/components/dashboard/presentation-list";
import { CreatePresentationDialog } from "@/components/dashboard/create-dialog";
import { Github } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-14 w-full max-w-[760px] items-center justify-between gap-2 px-3 md:h-16 md:gap-4 md:px-6">
          <Link href="/" className="text-sm font-medium tracking-tight transition-opacity hover:opacity-70 md:text-lg">
            SlideBoard
          </Link>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/HejSidharth/slideboard"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="SlideBoard GitHub repository"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:h-9 md:w-9"
            >
              <Github className="h-4 w-4" />
            </a>
            <CreatePresentationDialog
              label="New"
              showIcon={true}
              buttonSize="sm"
              className="h-8 gap-1 px-2.5 text-[11px] font-medium md:h-9 md:px-4 md:text-xs"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[760px] px-4 md:px-6 py-10">
        <section className="mb-10 border-b border-border pb-8">
          <p className="text-xs text-muted-foreground">Workspace</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Build editable decks.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Create, duplicate, import, and present with a clean local-first workflow.
          </p>
        </section>
        <PresentationList />
      </main>
    </div>
  );
}
