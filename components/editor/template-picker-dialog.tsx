"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { SLIDE_TEMPLATES, type SlideTemplateDefinition } from "@/lib/slide-templates";
import { TemplateCard } from "./template-card";

interface TemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (templateId: string, values: Record<string, string>) => void;
}

type DialogState = "grid" | "input";

export function TemplatePickerDialog({ open, onOpenChange, onSelectTemplate }: TemplatePickerDialogProps) {
  const [dialogState, setDialogState] = useState<DialogState>("grid");
  const [selectedTemplate, setSelectedTemplate] = useState<SlideTemplateDefinition | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  const handleTemplateClick = useCallback((template: SlideTemplateDefinition) => {
    if (template.prompts.length === 0) {
      // No prompts, create slide immediately
      onSelectTemplate(template.id, {});
      onOpenChange(false);
      resetDialog();
    } else {
      // Has prompts, show input form
      setSelectedTemplate(template);
      // Initialize input values with defaults
      const defaults: Record<string, string> = {};
      template.prompts.forEach((prompt) => {
        defaults[prompt.id] = "";
      });
      setInputValues(defaults);
      setDialogState("input");
    }
  }, [onSelectTemplate]);

  const handleInputChange = useCallback((promptId: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [promptId]: value }));
  }, []);

  const handleCreate = useCallback(() => {
    if (!selectedTemplate) return;
    
    // Use input values or fall back to defaults
    const finalValues: Record<string, string> = {};
    selectedTemplate.prompts.forEach((prompt) => {
      finalValues[prompt.id] = inputValues[prompt.id]?.trim() || prompt.defaultValue;
    });
    
    onSelectTemplate(selectedTemplate.id, finalValues);
    onOpenChange(false);
    resetDialog();
  }, [selectedTemplate, inputValues, onSelectTemplate, onOpenChange]);

  const handleSkip = useCallback(() => {
    if (!selectedTemplate) return;
    
    // Use all default values
    const defaultValues: Record<string, string> = {};
    selectedTemplate.prompts.forEach((prompt) => {
      defaultValues[prompt.id] = prompt.defaultValue;
    });
    
    onSelectTemplate(selectedTemplate.id, defaultValues);
    onOpenChange(false);
    resetDialog();
  }, [selectedTemplate, onSelectTemplate, onOpenChange]);

  const handleBack = useCallback(() => {
    setDialogState("grid");
    setSelectedTemplate(null);
    setInputValues({});
  }, []);

  const resetDialog = () => {
    setDialogState("grid");
    setSelectedTemplate(null);
    setInputValues({});
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      resetDialog();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col overflow-hidden">
        {dialogState === "grid" ? (
          <>
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Choose a Template</DialogTitle>
              <DialogDescription>
                Select a template to start with. You can customize it after creation.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-4">
                {SLIDE_TEMPLATES.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onClick={() => handleTemplateClick(template)}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <DialogTitle>{selectedTemplate?.name}</DialogTitle>
                  <DialogDescription>
                    Enter the text for your slide. Leave blank to use placeholders.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedTemplate?.prompts.map((prompt) => (
                <div key={prompt.id} className="space-y-2">
                  <Label htmlFor={prompt.id}>{prompt.label}</Label>
                  <Input
                    id={prompt.id}
                    placeholder={prompt.placeholder}
                    value={inputValues[prompt.id] || ""}
                    onChange={(e) => handleInputChange(prompt.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleCreate();
                      }
                    }}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleSkip}>
                Skip
              </Button>
              <Button onClick={handleCreate}>
                Create Slide
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
