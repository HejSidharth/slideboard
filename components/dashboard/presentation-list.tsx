"use client";

import { useRef } from "react";
import { usePresentationStore } from "@/store/use-presentation-store";
import { PresentationCard } from "./presentation-card";
import { CreatePresentationDialog } from "./create-dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from "lucide-react";

export function PresentationList() {
  const presentations = usePresentationStore((s) => s.presentations);
  const importPresentation = usePresentationStore((s) => s.importPresentation);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      importPresentation(text);
    } catch (error) {
      console.error("Failed to import file:", error);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Sort by most recently updated
  const sortedPresentations = [...presentations].sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  if (presentations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">No presentations yet</h2>
          <p className="text-muted-foreground max-w-md">
            Create your first presentation to start teaching with interactive
            whiteboard slides.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <CreatePresentationDialog />
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-5 w-5" />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.slideboard.json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-semibold">Your Presentations</h2>
          <p className="text-muted-foreground">
            {presentations.length} {presentations.length === 1 ? "presentation" : "presentations"}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <CreatePresentationDialog />
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.slideboard.json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedPresentations.map((presentation) => (
          <PresentationCard key={presentation.id} presentation={presentation} />
        ))}
      </div>
    </div>
  );
}
