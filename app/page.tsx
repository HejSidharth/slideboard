"use client";

import { CreatePresentationDialog } from "@/components/dashboard/create-dialog";
import ExcalidrawWrapper from "@/components/editor/excalidraw-wrapper";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import type { ExcalidrawElement } from "@/types";
import Link from "next/link";
import { 
  ArrowRight, 
  Presentation, 
  Zap, 
  Share2, 
  LayoutTemplate, 
  Pencil, 
  Moon,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";

const heroElements: ExcalidrawElement[] = [
  {
    id: "slide-frame",
    type: "rectangle",
    x: 120,
    y: 80,
    width: 380,
    height: 230,
    angle: 0,
    strokeColor: "#94a3b8",
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    roundness: null,
    seed: 12839123,
    version: 1,
    versionNonce: 12839123,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
  },
  {
    id: "editable-text",
    type: "text",
    x: 155,
    y: 120,
    width: 260,
    height: 32,
    angle: 0,
    strokeColor: "#94a3b8",
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    roundness: null,
    seed: 21839123,
    version: 1,
    versionNonce: 21839123,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    text: "Editable presentations",
    fontSize: 20,
    fontFamily: 1,
    textAlign: "left",
    verticalAlign: "top",
    baseline: 18,
    lineHeight: 1.2,
  },
  {
    id: "divider-line",
    type: "line",
    x: 155,
    y: 165,
    width: 220,
    height: 0,
    angle: 0,
    strokeColor: "#94a3b8",
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    roundness: null,
    seed: 31839123,
    version: 1,
    versionNonce: 31839123,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    points: [
      [0, 0],
      [220, 0],
    ],
  },
  {
    id: "note-1",
    type: "text",
    x: 155,
    y: 190,
    width: 280,
    height: 24,
    angle: 0,
    strokeColor: "#94a3b8",
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    roundness: null,
    seed: 41839123,
    version: 1,
    versionNonce: 41839123,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    text: "Refine every slide in place",
    fontSize: 16,
    fontFamily: 1,
    textAlign: "left",
    verticalAlign: "top",
    baseline: 14,
    lineHeight: 1.2,
  },
  {
    id: "arrow",
    type: "arrow",
    x: 155,
    y: 230,
    width: 180,
    height: 60,
    angle: 0,
    strokeColor: "#94a3b8",
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    roundness: null,
    seed: 51839123,
    version: 1,
    versionNonce: 51839123,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    points: [
      [0, 0],
      [180, 60],
    ],
    lastCommittedPoint: [180, 60],
    startArrowhead: null,
    endArrowhead: "arrow",
  },
  {
    id: "edit-box",
    type: "rectangle",
    x: 360,
    y: 250,
    width: 110,
    height: 48,
    angle: 0,
    strokeColor: "#94a3b8",
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    roundness: null,
    seed: 61839123,
    version: 1,
    versionNonce: 61839123,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
  },
  {
    id: "edit-text",
    type: "text",
    x: 378,
    y: 264,
    width: 74,
    height: 20,
    angle: 0,
    strokeColor: "#94a3b8",
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    roundness: null,
    seed: 71839123,
    version: 1,
    versionNonce: 71839123,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    text: "Edit",
    fontSize: 16,
    fontFamily: 1,
    textAlign: "center",
    verticalAlign: "middle",
    baseline: 14,
    lineHeight: 1.2,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Background Mesh Gradients */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-background/60 backdrop-blur-md supports-[backdrop-filter]:bg-background/30">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-2xl font-medium font-serif tracking-tight">SlideBoard</span>
          </Link>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="https://github.com/HejSidharth/slideboard" target="_blank" rel="noreferrer" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
            </nav>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="h-6 w-px bg-border/50 hidden md:block"></div>
              <Link href="/dashboard">
                <Button variant="default" size="sm" className="hidden md:flex">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col items-center text-center space-y-8 mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                v1.0 is now live
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-balance max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
                Presentations that <span className="text-primary">stay alive.</span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-2xl text-balance animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                SlideBoard combines the flexibility of an infinite canvas with the structure of a slide deck. Edit, annotate, and refine your ideas in real-time.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                <CreatePresentationDialog 
                  label="Start Creating for Free" 
                  className="h-12 px-8 text-base shadow-lg shadow-primary/20"
                />
                <Button variant="outline" size="lg" className="h-12 px-8 gap-2 group" asChild>
                  <a href="https://github.com/HejSidharth/slideboard" target="_blank" rel="noreferrer">
                    Star on GitHub <Share2 className="h-4 w-4 group-hover:text-primary transition-colors" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Hero Image / Demo */}
            <div className="relative mx-auto max-w-5xl perspective-1000 animate-in fade-in zoom-in-50 duration-1000 delay-500">
              {/* Decorative glows behind the image */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-violet-600 rounded-2xl blur opacity-20 dark:opacity-40"></div>
              
              <div className="relative rounded-xl border bg-background/50 backdrop-blur-xl shadow-2xl overflow-hidden transform transition-transform hover:scale-[1.01] duration-500">
                {/* Browser Chrome */}
                <div className="h-10 border-b bg-muted/50 flex items-center px-4 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                  </div>
                  <div className="mx-auto bg-background/50 h-6 w-64 rounded-md flex items-center justify-center text-[10px] text-muted-foreground font-mono">
                    slideboard.app/presentation/edit
                  </div>
                </div>
                
                {/* Excalidraw Area */}
                <div className="h-[400px] md:h-[600px] w-full bg-background relative">
                  <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] opacity-50"></div>
                  <ExcalidrawWrapper
                    initialElements={heroElements}
                    viewModeEnabled={false}
                    zenModeEnabled
                    gridModeEnabled={false}
                  />
                </div>
              </div>
            </div>
            
            {/* Social Proof */}
            <div className="mt-20 pt-10 border-t border-border/50 flex flex-col items-center gap-6">
              <p className="text-sm font-medium text-muted-foreground">TRUSTED BY EDUCATORS AND TEAMS AT</p>
              <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                {/* Simple text placeholders for logos to keep it clean */}
                <span className="text-xl font-bold font-mono">ACME Corp</span>
                <span className="text-xl font-bold font-serif">University.edu</span>
                <span className="text-xl font-bold italic">StartUp.io</span>
                <span className="text-xl font-bold tracking-widest">TEACHABLE</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section id="features" className="py-24 bg-muted/30 border-y border-border/50">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Everything you need to present</h2>
              <p className="text-muted-foreground text-lg">
                SlideBoard removes the friction between thinking and presenting. No more "Edit Mode" vs "View Mode" switching anxiety.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Large Card */}
              <div className="md:col-span-2 rounded-3xl border bg-background p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <LayoutTemplate className="w-64 h-64 -mr-16 -mt-16 text-primary" />
                </div>
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
                    <LayoutTemplate className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Smart Templates</h3>
                  <p className="text-muted-foreground max-w-md">
                    Jumpstart your presentation with 14+ professionally designed templates. From flowcharts to comparison tables, we've got you covered.
                  </p>
                </div>
              </div>

              {/* Tall Card */}
              <div className="md:row-span-2 rounded-3xl border bg-background p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-6">
                  <Pencil className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Infinite Canvas</h3>
                <p className="text-muted-foreground mb-8">
                  Break free from the 16:9 box. Each slide is a window into an infinite Excalidraw canvas. Pan, zoom, and explore ideas deeply.
                </p>
                <div className="absolute bottom-0 right-0 left-0 h-64 bg-gradient-to-t from-muted to-transparent"></div>
                <div className="relative h-full w-full bg-muted/50 rounded-lg border border-dashed border-muted-foreground/20 p-4">
                  <div className="flex gap-2 mb-2">
                     <div className="h-2 w-12 bg-muted-foreground/20 rounded"></div>
                     <div className="h-2 w-8 bg-muted-foreground/20 rounded"></div>
                  </div>
                  <div className="h-32 w-full bg-background rounded border border-border shadow-sm mb-4"></div>
                  <div className="h-2 w-full bg-muted-foreground/10 rounded mb-2"></div>
                  <div className="h-2 w-2/3 bg-muted-foreground/10 rounded"></div>
                </div>
              </div>

              {/* Small Card 1 */}
              <div className="rounded-3xl border bg-background p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6">
                  <Moon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Dark Mode</h3>
                <p className="text-muted-foreground text-sm">
                  Easy on the eyes, perfect for low-light presentation environments.
                </p>
              </div>

              {/* Small Card 2 */}
              <div className="rounded-3xl border bg-background p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mb-6">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Instant Export</h3>
                <p className="text-muted-foreground text-sm">
                  Export to JSON to backup your work or share with students directly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 -skew-y-3 z-[-1]"></div>
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-balance">
              Ready to transform your teaching?
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join thousands of educators who are switching to interactive, non-linear presentations. Open source and free to use.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <CreatePresentationDialog 
                label="Get Started Now" 
                className="h-14 px-8 text-lg rounded-full"
              />
              <Link href="/dashboard" className="text-sm font-medium hover:underline underline-offset-4 text-muted-foreground">
                Or try the demo without saving
              </Link>
            </div>
            
            <div className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Open Source</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Works offline (PWA)</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/20 py-12 px-6">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-medium font-serif tracking-tight">SlideBoard</span>
          </div>
          
          <p className="text-sm text-muted-foreground text-center md:text-right">
            © {new Date().getFullYear()} SlideBoard. Built with Next.js, Excalidraw, and Tailwind.
          </p>
          
          <div className="flex gap-6">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <span className="sr-only">Twitter</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
            <a href="https://github.com/HejSidharth/slideboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <span className="sr-only">GitHub</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
