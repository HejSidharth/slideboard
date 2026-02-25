"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { useMemo } from "react";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  const convexClient = useMemo(() => {
    if (!convexUrl) return null;
    return new ConvexReactClient(convexUrl);
  }, [convexUrl]);

  const inner = (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      disableTransitionOnChange={false}
    >
      <TooltipProvider delayDuration={300}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </TooltipProvider>
    </NextThemesProvider>
  );

  if (!convexClient) {
    return inner;
  }

  return (
    <ConvexProvider client={convexClient}>
      {inner}
    </ConvexProvider>
  );
}
