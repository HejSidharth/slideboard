"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { usePresentationStore } from "@/store/use-presentation-store";

interface CreatePresentationDialogProps {
  label?: string;
  showIcon?: boolean;
  buttonSize?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function CreatePresentationDialog({
  label = "New Presentation",
  showIcon = true,
  buttonSize = "lg",
  className,
}: CreatePresentationDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const router = useRouter();
  const createPresentation = usePresentationStore((s) => s.createPresentation);

  const handleCreate = () => {
    if (!name.trim()) return;
    const id = createPresentation(name.trim());
    setName("");
    setOpen(false);
    router.push(`/presentation/${id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={buttonSize} className={cn(showIcon ? "gap-2" : "", className)}>
          {showIcon && <Plus className="h-5 w-5" />}
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Presentation</DialogTitle>
          <DialogDescription>
            Give your presentation a name. You can always change it later.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            id="name"
            placeholder="e.g., Math Lesson - Quadratics"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
