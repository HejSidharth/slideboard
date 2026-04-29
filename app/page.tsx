"use client";

import Image from "next/image";
import Link from "next/link";
import { Github, Star } from "lucide-react";
import packageJson from "@/package.json";
import { Button } from "@/components/ui/button";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export default function HomePage() {
  const [major = "0", minor = "1"] = packageJson.version.split(".");

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-28 left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl animate-float-soft" />
        <div
          className="absolute bottom-6 right-[-80px] h-[260px] w-[260px] rounded-full bg-primary/8 blur-3xl animate-float-soft"
          style={{ animationDelay: "-2.5s" }}
        />
      </div>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75 border-b border-border/70">
        <div className="mx-auto flex h-14 w-full max-w-[760px] items-center justify-between gap-2 px-3 animate-fade-down md:h-16 md:gap-3 md:px-6">
          <div className="flex items-center">
            <Link 
              href="/" 
              className="text-sm font-medium tracking-tight transition-opacity hover:opacity-70 md:text-lg"
            >
              SlideBoard
            </Link>
            <Link
              href="/changelog"
              className="ml-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground md:text-xs"
            >
              v{major}.{minor}
            </Link>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
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
            <Button asChild className="h-8 rounded-lg px-3 text-[11px] font-medium md:h-9 md:px-4 md:text-xs">
              <Link href="/dashboard">Start</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center pt-16">
        <div className="max-w-[760px] w-full px-4 md:px-6">
          <div className="pt-16 md:pt-20 pb-8">
            <a 
              href="https://startup.z.ai/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground mb-6 hover:bg-muted hover:text-foreground transition-colors animate-fade-up"
            >
              <span>Backed by</span>
              <Image
                src="/z-ai-logo.png"
                alt="Z.ai logo"
                width={16}
                height={16}
                className="rounded-[3px]"
              />
              <span>AI</span>
            </a>
            <h1 className="text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-[-0.03em] text-balance mb-6 animate-fade-up [animation-delay:120ms]">
              Whiteboard lessons,{" "}
              <span className="text-primary">reimagined.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-[560px] mb-10 animate-fade-up [animation-delay:220ms]">
              Create interactive presentations that stay editable. 
              Built for educators who want more than slides.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 animate-fade-up [animation-delay:320ms]">
              <Button asChild className="h-11 px-6 rounded-lg text-sm font-medium">
                <Link href="/dashboard">Start creating</Link>
              </Button>
              <Button variant="outline" asChild className="h-11 px-6 rounded-lg text-sm font-medium">
                <a href="https://github.com/HejSidharth/slideboard">
                  <Star className="mr-2 h-4 w-4" />
                  Star on GitHub
                </a>
              </Button>
            </div>
          </div>

          <div className="border-t border-border" />

          <div className="pt-8 pb-14 md:pb-16 animate-fade-up [animation-delay:420ms]">
            <div className="grid md:grid-cols-3 gap-8 md:gap-10">
              <div>
                <h3 className="font-medium text-foreground mb-2 text-sm">Live Drawing</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Sketch, annotate, and edit in real-time. Every slide stays interactive.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2 text-sm">Fully Open Source</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Always self hostable, so you can deploy anywhere and keep full control.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2 text-sm">Zero Setup</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Open and start creating. No installation, no configuration needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>


    </div>
  );
}
