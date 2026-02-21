"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export default function HomePage() {
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
        <div className="max-w-[760px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between animate-fade-down">
          <Link 
            href="/" 
            className="text-base md:text-lg font-medium tracking-tight hover:opacity-70 transition-opacity"
          >
            SlideBoard
          </Link>
          
          <div className="flex items-center gap-3">
            <AnimatedThemeToggler />
            <Button asChild className="h-9 px-4 text-xs font-medium rounded-lg">
              <Link href="/dashboard">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center pt-16">
        <div className="max-w-[760px] w-full px-4 md:px-6">
          <div className="pt-16 md:pt-20 pb-8">
            <a 
              href="https://hejamadi.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground mb-6 hover:bg-muted hover:text-foreground transition-colors animate-fade-up"
            >
              Made by Hejamadi
            </a>
            <h1 className="text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-[-0.03em] text-balance mb-6 animate-fade-up [animation-delay:120ms]">
              Whiteboard lessons,{" "}
              <span className="text-primary">reimagined</span>.
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
                <Link href="/dashboard">View Demo</Link>
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
                <h3 className="font-medium text-foreground mb-2 text-sm">Local First</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your data stays on your device. No accounts, no cloud, no compromises.
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
