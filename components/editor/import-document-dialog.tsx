"use client";

import { useCallback, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import {
  importDocumentAsSlides,
  isAcceptedFile,
  isPowerPointFile,
} from "@/lib/document-import";
import type { ImportProgress, ImportStage } from "@/lib/document-import";
import type { ExtractedProblem } from "@/types";

/** Shorten a filename to a max character length, preserving the extension. */
function truncateFileName(name: string, maxBase = 10): string {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0) return name.length > maxBase ? name.slice(0, maxBase) + "..." : name;
  const base = name.slice(0, dotIndex);
  const ext = name.slice(dotIndex);
  if (base.length <= maxBase) return name;
  return base.slice(0, maxBase) + "..." + ext;
}

interface ImportDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (problems: ExtractedProblem[], fileName: string) => void;
}

const STAGE_LABELS: Record<ImportStage, string> = {
  idle: "Ready",
  rendering: "Rendering PDF pages",
  analyzing: "AI is analyzing problems",
  cropping: "Cropping problems",
  complete: "Done",
  error: "Error",
};

export function ImportDocumentDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ImportDocumentDialogProps) {
  const [progress, setProgress] = useState<ImportProgress>({
    stage: "idle",
    progress: 0,
    message: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [resultCount, setResultCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const isProcessing =
    progress.stage !== "idle" &&
    progress.stage !== "complete" &&
    progress.stage !== "error";

  const reset = useCallback(() => {
    setProgress({ stage: "idle", progress: 0, message: "" });
    setError(null);
    setResultCount(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && isProcessing) return;
      if (!nextOpen) reset();
      onOpenChange(nextOpen);
    },
    [isProcessing, onOpenChange, reset],
  );

  const handleFileDrop = useCallback(
    (file: File) => {
      if (isPowerPointFile(file)) {
        setError(
          "PowerPoint files are not supported directly. Please export your presentation as PDF first (File > Save As > PDF).",
        );
        return;
      }

      if (!isAcceptedFile(file)) {
        setError("Unsupported file type. Please upload a PDF or image (PNG/JPG).");
        return;
      }

      setSelectedFile(file);
      setError(null);
    },
    [],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      handleFileDrop(file);
    },
    [handleFileDrop],
  );

  const handleImport = useCallback(async () => {
    if (!selectedFile) return;

    setError(null);
    setResultCount(null);

    try {
      const problems = await importDocumentAsSlides(selectedFile, setProgress);

      if (problems.length === 0) {
        setError("No pages could be read from this document. Try a different file.");
        setProgress({ stage: "error", progress: 0, message: "" });
        return;
      }

      setResultCount(problems.length);
      onImportComplete(problems, selectedFile.name);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setProgress({ stage: "error", progress: 0, message: "" });
    }
  }, [selectedFile, onImportComplete]);

  const progressPercent = Math.round(progress.progress * 100);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from Document</DialogTitle>
          <DialogDescription>
            Upload a PDF or image to create slides. Each page becomes its own
            slide.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* File selection */}
          {progress.stage === "idle" && (
            <>
              <div
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileDrop(file);
                }}
              >
                <FileUp className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">
                  {selectedFile ? truncateFileName(selectedFile.name) : "Click or drag to upload"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, PNG, or JPG
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                className="hidden"
                onChange={handleFileSelect}
              />

              {selectedFile && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{truncateFileName(selectedFile.name)}</span>
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">
                    {(selectedFile.size / 1024).toFixed(0)} KB
                  </span>
                </div>
              )}
            </>
          )}

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {STAGE_LABELS[progress.stage]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {progress.message}
                  </p>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {progressPercent}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Complete */}
          {progress.stage === "complete" && resultCount !== null && (
            <div className="flex items-center gap-3 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium">
                  {resultCount} slide{resultCount !== 1 ? "s" : ""} created
                </p>
                <p className="text-xs text-muted-foreground">
                  Slides have been created. You can close this dialog.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Import failed</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {error}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {progress.stage === "complete" ? (
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          ) : progress.stage === "error" ? (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={reset}>Try Again</Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!selectedFile || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Import as Slides"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
