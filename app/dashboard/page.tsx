"use client";

import { PresentationList } from "@/components/dashboard/presentation-list";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
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
            <AnimatedThemeToggler />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[760px] px-4 py-6 md:px-6 md:py-8">
        <PresentationList />
      </main>
    </div>
  );
}
