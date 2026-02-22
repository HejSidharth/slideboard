"use client";

import { useCallback, useRef } from "react";
import { Moon, Sun } from "lucide-react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number;
}

export const AnimatedThemeToggler = ({
  className,
  duration = 400,
  ...props
}: AnimatedThemeTogglerProps) => {
  const { resolvedTheme, setTheme } = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isDark = resolvedTheme === "dark";

  const toggleTheme = useCallback(async () => {
    const nextTheme = isDark ? "light" : "dark";

    const startViewTransition = (
      document as Document & {
        startViewTransition?: (updateCallback: () => void) => { ready: Promise<void> };
      }
    ).startViewTransition?.bind(document);

    if (!buttonRef.current || !startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    try {
      await startViewTransition(() => {
        flushSync(() => {
          setTheme(nextTheme);
        });
      }).ready;
    } catch {
      setTheme(nextTheme);
      return;
    }

    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;
    const maxRadius = Math.hypot(x, y);

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  }, [duration, isDark, setTheme]);

  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      className={cn(
        "h-9 w-9 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-secondary transition-colors",
        className,
      )}
      {...props}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
};
