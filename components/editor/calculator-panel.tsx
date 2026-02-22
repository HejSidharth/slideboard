"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExternalLink, GripHorizontal, LocateFixed, X } from "lucide-react";

interface Point {
  x: number;
  y: number;
}

export type CalculatorMode = "floating" | "sheet";

interface FloatingCalculatorPanelProps {
  presentationId: string;
  onModeChange: (mode: CalculatorMode) => void;
  onClose: () => void;
}

interface DockedCalculatorPanelProps {
  className?: string;
  onModeChange: (mode: CalculatorMode) => void;
  onClose: () => void;
}

const DESMOS_URL = "https://www.desmos.com/calculator";
const DESKTOP_WIDTH = 400;
const DESKTOP_HEIGHT = 500;
const EDGE_GAP = 12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampToViewport(next: Point): Point {
  if (typeof window === "undefined") return next;

  const maxX = Math.max(EDGE_GAP, window.innerWidth - DESKTOP_WIDTH - EDGE_GAP);
  const maxY = Math.max(EDGE_GAP, window.innerHeight - DESKTOP_HEIGHT - EDGE_GAP);

  return {
    x: clamp(next.x, EDGE_GAP, maxX),
    y: clamp(next.y, EDGE_GAP, maxY),
  };
}

function getCenteredPosition(): Point {
  if (typeof window === "undefined") return { x: 100, y: 90 };

  return clampToViewport({
    x: (window.innerWidth - DESKTOP_WIDTH) / 2,
    y: (window.innerHeight - DESKTOP_HEIGHT) / 2,
  });
}

function readStoredPosition(storageKey: string): Point | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<Point>;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return clampToViewport({ x: parsed.x, y: parsed.y });
    }
  } catch {
    return null;
  }

  return null;
}

function DesmosEmbed({
  frameFailed,
  onFrameError,
}: {
  frameFailed: boolean;
  onFrameError: () => void;
}) {
  if (frameFailed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-sm text-muted-foreground">Calculator failed to load.</p>
        <Button
          size="sm"
          onClick={() => window.open("https://www.desmos.com/calculator", "_blank", "noopener,noreferrer")}
        >
          Open Desmos in new tab
        </Button>
      </div>
    );
  }

  return (
    <iframe
      title="Desmos Calculator"
      src={DESMOS_URL}
      className="h-full w-full border-0"
      allow="clipboard-read; clipboard-write"
      onError={onFrameError}
    />
  );
}

export function CalculatorPanel({
  presentationId,
  onModeChange,
  onClose,
}: FloatingCalculatorPanelProps) {
  const dragOffsetRef = useRef<Point>({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const [frameFailed, setFrameFailed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });

  const positionStorageKey = useMemo(
    () => `slideboard-calculator-position:${presentationId}`,
    [presentationId],
  );

  const [position, setPosition] = useState<Point>(() => {
    if (typeof window === "undefined") return { x: 100, y: 90 };
    return readStoredPosition(`slideboard-calculator-position:${presentationId}`) ?? getCenteredPosition();
  });

  const recenterPanel = useCallback(() => {
    setPosition(getCenteredPosition());
  }, []);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth < 768;
      setIsMobile(nextIsMobile);
      if (!nextIsMobile) {
        setPosition((prev) => clampToViewport(prev));
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) return;
    window.localStorage.setItem(positionStorageKey, JSON.stringify(position));
  }, [isMobile, position, positionStorageKey]);

  useEffect(() => {
    if (isMobile) return;

    const frame = window.requestAnimationFrame(() => {
      const stored = readStoredPosition(positionStorageKey);
      if (stored) {
        setPosition(stored);
        return;
      }
      setPosition(getCenteredPosition());
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isMobile, positionStorageKey]);

  useEffect(() => {
    if (isMobile) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (!draggingRef.current) return;
      const next = {
        x: event.clientX - dragOffsetRef.current.x,
        y: event.clientY - dragOffsetRef.current.y,
      };
      setPosition(clampToViewport(next));
    };

    const handlePointerUp = () => {
      draggingRef.current = false;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isMobile]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isMobile) return;

    draggingRef.current = true;
    dragOffsetRef.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
  };

  if (typeof document === "undefined") return null;

  const content = (
    <div
      className="fixed z-[9999] overflow-hidden rounded-lg border border-border bg-background shadow-2xl"
      style={
        isMobile
          ? {
              left: "50%",
              top: "50%",
              width: "92vw",
              maxWidth: "420px",
              height: "64vh",
              maxHeight: "560px",
              transform: "translate(-50%, -50%)",
            }
          : {
              left: `${position.x}px`,
              top: `${position.y}px`,
              width: `${DESKTOP_WIDTH}px`,
              height: `${DESKTOP_HEIGHT}px`,
            }
      }
    >
      <div className="flex h-10 items-center justify-between border-b border-border bg-muted px-2">
        <div
          className="flex min-w-0 flex-1 cursor-move items-center gap-2 text-xs text-muted-foreground"
          onPointerDown={handlePointerDown}
        >
          <GripHorizontal className="h-3.5 w-3.5" />
          Calculator
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={recenterPanel}>
            <LocateFixed className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onModeChange("sheet")}
          >
            Dock
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => window.open("https://www.desmos.com/calculator", "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="h-[calc(100%-2.5rem)] w-full bg-background">
        <DesmosEmbed frameFailed={frameFailed} onFrameError={() => setFrameFailed(true)} />
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

export function CalculatorDockPanel({ className, onModeChange, onClose }: DockedCalculatorPanelProps) {
  const [frameFailed, setFrameFailed] = useState(false);

  return (
    <aside className={cn("h-full", className)}>
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium tracking-tight">Calculator</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onModeChange("floating")}
              >
                Float
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => window.open("https://www.desmos.com/calculator", "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-background">
          <DesmosEmbed frameFailed={frameFailed} onFrameError={() => setFrameFailed(true)} />
        </div>
      </div>
    </aside>
  );
}
