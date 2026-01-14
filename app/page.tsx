"use client";

import { CreatePresentationDialog } from "@/components/dashboard/create-dialog";
import ExcalidrawWrapper from "@/components/editor/excalidraw-wrapper";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import type { ExcalidrawElement } from "@/types";
import Link from "next/link";

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-semibold">SlideBoard</span>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
            <a
              href="https://github.com/HejSidharth/slideboard"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              GitHub
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-12">
        <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] items-center">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Editable by design
              </p>
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-balance">
                Create presentations that stay editable.
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                SlideBoard keeps every slide as a living whiteboard so you can edit, refine, and
                teach without rebuilding your deck.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <CreatePresentationDialog
                label="Create presentation"
                showIcon={false}
                className="px-6"
              />
              <p className="text-sm text-muted-foreground">
                Slides save automatically in your browser.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4 shadow-sm">
            <div className="h-[360px] w-full overflow-hidden rounded-xl border bg-background">
              <ExcalidrawWrapper
                initialElements={heroElements}
                viewModeEnabled={false}
                zenModeEnabled
                gridModeEnabled={false}
              />
            </div>
          </div>
        </section>
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
