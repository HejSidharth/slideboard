"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Clock3, Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePresentationTimer } from "@/hooks/use-presentation-timer";

interface PresentationTimerProps {
  presentationId: string;
  variant?: "editor" | "present";
  className?: string;
}

export function PresentationTimer({
  presentationId,
  variant = "editor",
  className,
}: PresentationTimerProps) {
  const {
    durationSec,
    remainingMs,
    isRunning,
    isFinished,
    formattedTime,
    maxDurationSec,
    start,
    pause,
    resume,
    reset,
    setDuration,
  } = usePresentationTimer(presentationId);

  const [customOpen, setCustomOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("3");
  const [customSeconds, setCustomSeconds] = useState("0");

  const hasPausedTime = !isRunning && remainingMs > 0 && remainingMs < durationSec * 1000;
  const isCritical = !isFinished && remainingMs > 0 && remainingMs <= 10_000;

  const triggerClassName = cn(
    variant === "present"
      ? "h-9 rounded-md border border-white/30 bg-black/65 px-3 text-sm font-medium text-white hover:bg-black/75"
      : "h-9 rounded-md border border-border bg-background px-3 text-xs font-medium",
    isCritical &&
      (variant === "present"
        ? "animate-pulse border-red-400 bg-red-400 text-white hover:bg-red-400"
        : "animate-pulse border-red-400 bg-red-400 text-white hover:bg-red-400"),
    isFinished &&
      (variant === "present"
        ? "border-red-400 bg-red-400 text-white hover:bg-red-400"
        : "border-red-400 bg-red-400 text-white hover:bg-red-400"),
  );

  const timeTextClassName = cn(
    "font-mono tracking-tight",
    variant === "present" || isCritical || isFinished ? "text-white" : "text-foreground",
  );

  const openCustomDialog = () => {
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    setCustomMinutes(String(mins));
    setCustomSeconds(String(secs));
    requestAnimationFrame(() => {
      setCustomOpen(true);
    });
  };

  const applyCustomDuration = () => {
    const minutes = Math.max(0, Number.parseInt(customMinutes, 10) || 0);
    const seconds = Math.max(0, Number.parseInt(customSeconds, 10) || 0);
    const total = minutes * 60 + seconds;
    if (total <= 0) return;

    setDuration(total);
    setCustomOpen(false);
  };

  const currentStatus = useMemo(() => {
    if (isFinished) return "Time's up";
    if (isRunning) return "Running";
    if (hasPausedTime) return "Paused";
    return "Ready";
  }, [hasPausedTime, isFinished, isRunning]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={cn(triggerClassName, className)}>
            <Clock3 className={cn("mr-2 h-4 w-4", (isCritical || isFinished) && "text-white")} />
            <span className={timeTextClassName}>{formattedTime}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Problem Timer</span>
            <span className="text-xs font-normal text-muted-foreground">{currentStatus}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={() => start(2 * 60)}>Start 2:00</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => start(3 * 60)}>Start 3:00</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => start(5 * 60)}>Start 5:00</DropdownMenuItem>
          <DropdownMenuItem onSelect={openCustomDialog}>Custom...</DropdownMenuItem>

          <DropdownMenuSeparator />

          {isRunning ? (
            <DropdownMenuItem onSelect={pause}>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </DropdownMenuItem>
          ) : hasPausedTime ? (
            <DropdownMenuItem onSelect={resume}>
              <Play className="mr-2 h-4 w-4" />
              Resume
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => start()}>
              <Play className="mr-2 h-4 w-4" />
              Start
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onSelect={reset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set custom timer</DialogTitle>
            <DialogDescription>
              Enter minutes and seconds. Maximum is {Math.floor(maxDurationSec / 60)} minutes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Minutes</p>
              <Input
                inputMode="numeric"
                value={customMinutes}
                onChange={(event) => setCustomMinutes(event.target.value.replace(/\D/g, ""))}
                placeholder="0"
              />
            </div>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Seconds</p>
              <Input
                inputMode="numeric"
                value={customSeconds}
                onChange={(event) => setCustomSeconds(event.target.value.replace(/\D/g, ""))}
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyCustomDuration}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
