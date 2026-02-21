"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Key } from "lucide-react";

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (key: string) => void;
}

export function ApiKeyDialog({ open, onOpenChange, onSave }: ApiKeyDialogProps) {
  const [key, setKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handleSave = async () => {
    if (!key.trim()) return;
    setIsValidating(true);
    
    // Just save it - we'll validate on first use
    onSave(key.trim());
    setKey("");
    setIsValidating(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              OpenRouter API Key
            </DialogTitle>
          <DialogDescription>
            Enter your OpenRouter API key to enable SlideBoard Assistant. Your key stays stored locally in your browser.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <Input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-or-v1-..."
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />

          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Get an API key from OpenRouter
          </a>

          <p className="text-xs text-muted-foreground">
            SlideBoard sends prompts directly from your browser to OpenRouter.
            You can start with free credits.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!key.trim() || isValidating}>
            {isValidating ? "Validating..." : "Save API Key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
