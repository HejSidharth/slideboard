"use client";

import { useCallback, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

interface ShareDialogProps {
  presentationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({
  presentationId,
  open,
  onOpenChange,
}: ShareDialogProps) {
  const [copiedJoin, setCopiedJoin] = useState(false);
  const [copiedPresent, setCopiedPresent] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = `${origin}/presentation/${presentationId}/join`;
  const presentUrl = `${origin}/presentation/${presentationId}/present`;

  const copyToClipboard = useCallback(
    async (url: string, type: "join" | "present") => {
      try {
        await navigator.clipboard.writeText(url);
        if (type === "join") {
          setCopiedJoin(true);
          setTimeout(() => setCopiedJoin(false), 2000);
        } else {
          setCopiedPresent(true);
          setTimeout(() => setCopiedPresent(false), 2000);
        }
      } catch {
        // Fallback for older browsers
        const textarea = document.createElement("textarea");
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        if (type === "join") {
          setCopiedJoin(true);
          setTimeout(() => setCopiedJoin(false), 2000);
        } else {
          setCopiedPresent(true);
          setTimeout(() => setCopiedPresent(false), 2000);
        }
      }
    },
    []
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Presentation</DialogTitle>
          <DialogDescription>
            Share this link with participants so they can chat and vote on polls.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* QR Code */}
          <div className="flex justify-center rounded-lg border border-border bg-white p-4">
            <QRCodeSVG
              value={joinUrl}
              size={180}
              level="M"
              marginSize={0}
            />
          </div>

          {/* Copy buttons */}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => copyToClipboard(joinUrl, "join")}
            >
              {copiedJoin ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copiedJoin ? "Copied!" : "Copy join link"}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => copyToClipboard(presentUrl, "present")}
            >
              {copiedPresent ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copiedPresent ? "Copied!" : "Copy present mode link"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Participants get an anonymous identity automatically.
            No account required.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
