"use client";

import { PresentationList } from "@/components/dashboard/presentation-list";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { Presentation } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground">
              <Presentation className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">SlideBoard</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <PresentationList />
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>SlideBoard - Interactive whiteboard presentations for tutoring</p>
        </div>
      </footer>
    </div>
  );
}
