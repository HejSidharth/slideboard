import Link from "next/link";
import { Github } from "lucide-react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

const changelogEntries = [
  {
    date: "March 3, 2026",
    title: "Landing Page Messaging Refresh",
    summary: "Sharpened the homepage CTA and open-source positioning so the product pitch is clearer at first glance.",
    details: [
      "Updated the homepage call-to-action flow.",
      "Refined messaging around self-hosting and open-source access.",
    ],
  },
  {
    date: "March 2, 2026",
    title: "Editor Navigation and Templates",
    summary: "Made the editor faster to control from the keyboard and added more structured Excalidraw starting points.",
    details: [
      "Enabled arrow-key slide navigation inside the editor.",
      "Added Excalidraw templates for quicker lesson setup.",
    ],
  },
  {
    date: "February 26, 2026",
    title: "Assistant Workflow Upgrade",
    summary: "Turned the assistant into a more classroom-friendly tool with better chat ergonomics and richer slide insertion flows.",
    details: [
      "Expanded assistant workflows beyond generic chat responses.",
      "Improved Q&A interactions and response presentation.",
      "Added better capture and insertion support for assistant output.",
    ],
  },
  {
    date: "February 25, 2026",
    title: "Real-Time Classroom Layer",
    summary: "SlideBoard grew from a local whiteboard deck editor into a live teaching surface with participation tools.",
    details: [
      "Added anonymous chat, polls, share links, and a dedicated join flow.",
      "Introduced notifications, poll likes, and participant-facing UI polish.",
      "Laid down live canvas sync infrastructure for presenter broadcasting.",
      "Unified polls and hosted questions into a single activities flow.",
      "Added hosted MCQ and free-response activities with timers, reveal controls, and teacher moderation.",
    ],
  },
  {
    date: "February 24, 2026",
    title: "PDF and Worksheet Import",
    summary: "Made it possible to turn existing teaching material into editable slides instead of rebuilding from scratch.",
    details: [
      "Added PDF and image import into the slide workflow.",
      "Introduced AI-assisted problem extraction and cropping.",
      "Polished dashboard menu behavior and import defaults.",
    ],
  },
  {
    date: "February 23, 2026",
    title: "Presentation Runtime Controls",
    summary: "Presenter mode became much more usable for real teaching sessions.",
    details: [
      "Added a presentation timer shared between editor and present mode.",
      "Integrated Tldraw license-key support with safer loading.",
      "Added the Ctrl+J slide shortcut and related discoverability hints.",
    ],
  },
  {
    date: "February 22, 2026",
    title: "Editing Checkpoints and Dashboard Polish",
    summary: "This release focused on faster recovery while teaching and a more polished workspace experience.",
    details: [
      "Added problem-state checkpoints so slides can be reset to a saved baseline.",
      "Introduced the dockable calculator workflow.",
      "Redesigned the dashboard and hardened assistant route configuration.",
      "Fixed theme toggle sync across editing surfaces.",
    ],
  },
  {
    date: "February 21, 2026",
    title: "Major Product and Website Refactor",
    summary: "A big turning point for both the product surface and the marketing site.",
    details: [
      "Refactored the website and introduced the current landing-page design direction.",
      "Added homepage motion and fixed folder-menu interaction issues.",
      "Introduced per-deck Excalidraw support.",
      "Improved mobile navbar behavior and deck rename UX.",
      "Moved the assistant to an env-backed OpenRouter route.",
      "Made Excalidraw the default for new decks.",
    ],
  },
  {
    date: "January 14, 2026",
    title: "Presentation Polish Pass",
    summary: "Focused on presenter usability and small but visible quality improvements.",
    details: [
      "Added a persistent slide counter in presentation mode.",
      "Added the Esc exit hint and tightened button sizing.",
      "Tested and reverted an early color experiment rather than shipping it half-finished.",
    ],
  },
  {
    date: "January 13, 2026",
    title: "Project Bootstrap",
    summary: "The repo was initialized and the first editor/navigation foundations landed the same day.",
    details: [
      "Bootstrapped the Next.js app and initial repository structure.",
      "Added the first working SlideBoard commit and repo docs.",
      "Introduced the collapsing slide sidebar.",
    ],
  },
] as const;

export default function ChangelogPage() {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl animate-float-soft" />
        <div className="absolute top-[28rem] left-[-120px] h-[260px] w-[260px] rounded-full bg-primary/8 blur-3xl animate-float-soft" style={{ animationDelay: "-1.8s" }} />
        <div className="absolute bottom-12 right-[-80px] h-[260px] w-[260px] rounded-full bg-primary/8 blur-3xl animate-float-soft" style={{ animationDelay: "-3s" }} />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-14 w-full max-w-[760px] items-center justify-between gap-2 px-3 md:h-16 md:gap-3 md:px-6">
          <Link
            href="/"
            className="text-sm font-medium tracking-tight transition-opacity hover:opacity-70 md:text-lg"
          >
            SlideBoard
          </Link>

          <div className="flex items-center gap-2 md:gap-3">
            <Link
              href="/dashboard"
              className="hidden text-xs text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              Dashboard
            </Link>
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

      <main className="mx-auto w-full max-w-[760px] px-4 pb-16 pt-10 md:px-6 md:pb-24 md:pt-16">
        <section className="pb-10 md:pb-14">
          <h1 className="text-3xl font-semibold leading-tight tracking-[-0.03em] text-balance animate-fade-up md:text-4xl">
            Changelog
          </h1>
          <p className="mt-3 text-sm text-muted-foreground animate-fade-up [animation-delay:120ms] md:text-base">
            Changes that have been made to the app! Changelog curated by AI
          </p>
        </section>

        <section className="relative animate-fade-up [animation-delay:420ms]">
          <div className="absolute left-[11px] top-0 h-full w-px bg-border" />
          <div className="space-y-8">
            {changelogEntries.map((entry) => (
              <article key={`${entry.date}-${entry.title}`} className="relative pl-10">
                <div className="absolute left-0 top-1.5 h-[22px] w-[22px] rounded-full border border-primary/25 bg-background shadow-sm">
                  <div className="mx-auto mt-[5px] h-2.5 w-2.5 rounded-full bg-primary" />
                </div>
                <div className="rounded-3xl border border-border bg-card/95 p-5 shadow-sm backdrop-blur md:p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
                        {entry.date}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                        {entry.title}
                      </h2>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                    {entry.summary}
                  </p>

                  <ul className="mt-4 space-y-2">
                    {entry.details.map((detail) => (
                      <li
                        key={detail}
                        className="flex items-start gap-3 text-sm leading-relaxed text-foreground/90"
                      >
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/70" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
