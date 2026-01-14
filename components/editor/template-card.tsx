"use client";

import { cn } from "@/lib/utils";
import type { SlideTemplateDefinition } from "@/lib/slide-templates";

interface TemplateCardProps {
  template: SlideTemplateDefinition;
  onClick: () => void;
  isSelected?: boolean;
}

export function TemplateCard({ template, onClick, isSelected }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
        "hover:border-primary/50 hover:bg-muted/50",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isSelected
          ? "border-primary bg-primary/10"
          : "border-border bg-background"
      )}
    >
      {/* Template Icon/Preview */}
      <div className="w-full aspect-[16/10] rounded border bg-muted/30 flex items-center justify-center overflow-hidden">
        <TemplateIcon templateId={template.id} />
      </div>
      
      {/* Template Name */}
      <div className="text-center">
        <p className="text-sm font-medium">{template.name}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">{template.description}</p>
      </div>
    </button>
  );
}

// Simple SVG icons representing template layouts
function TemplateIcon({ templateId }: { templateId: string }) {
  const iconClass = "w-full h-full p-2";
  const strokeColor = "currentColor";
  const strokeWidth = 1.5;
  
  switch (templateId) {
    case "blank":
      return (
        <svg className={iconClass} viewBox="0 0 80 50" fill="none" stroke={strokeColor} strokeWidth={strokeWidth}>
          <rect x="5" y="5" width="70" height="40" rx="2" strokeDasharray="4 2" opacity="0.3" />
        </svg>
      );
      
    case "title-only":
      return (
        <svg className={iconClass} viewBox="0 0 80 50" fill="none" stroke={strokeColor} strokeWidth={strokeWidth}>
          <line x1="20" y1="25" x2="60" y2="25" strokeWidth="3" />
        </svg>
      );
      
    case "title-subtitle":
      return (
        <svg className={iconClass} viewBox="0 0 80 50" fill="none" stroke={strokeColor} strokeWidth={strokeWidth}>
          <line x1="20" y1="20" x2="60" y2="20" strokeWidth="3" />
          <line x1="25" y1="32" x2="55" y2="32" strokeWidth="1.5" opacity="0.6" />
        </svg>
      );
      
    case "section-header":
      return (
        <svg className={iconClass} viewBox="0 0 80 50" fill="none" stroke={strokeColor} strokeWidth={strokeWidth}>
          <line x1="15" y1="15" x2="65" y2="15" />
          <line x1="25" y1="25" x2="55" y2="25" strokeWidth="2.5" />
          <line x1="15" y1="35" x2="65" y2="35" />
        </svg>
      );
      
    case "title-bullets":
      return (
        <svg className={iconClass} viewBox="0 0 80 50" fill="none" stroke={strokeColor} strokeWidth={strokeWidth}>
          <line x1="15" y1="10" x2="50" y2="10" strokeWidth="2" />
          <circle cx="18" cy="22" r="2" fill={strokeColor} />
          <line x1="24" y1="22" x2="55" y2="22" />
          <circle cx="18" cy="32" r="2" fill={strokeColor} />
          <line x1="24" y1="32" x2="55" y2="32" />
          <circle cx="18" cy="42" r="2" fill={strokeColor} />
          <line x1="24" y1="42" x2="55" y2="42" />
        </svg>
      );
      
    case "two-columns":
      return (
        <svg className={iconClass} viewBox="0 0 80 50" fill="none" stroke={strokeColor} strokeWidth={strokeWidth}>
          <line x1="25" y1="8" x2="55" y2="8" strokeWidth="2" />
          <rect x="8" y="15" width="28" height="30" rx="2" />
          <rect x="44" y="15" width="28" height="30" rx="2" />
        </svg>
      );
      
    case "comparison":
      return (
        <svg className={iconClass} viewBox="0 0 80 50" fill="none" stroke={strokeColor} strokeWidth={strokeWidth}>
          <line x1="25" y1="6" x2="55" y2="6" strokeWidth="2" />
          <rect x="8" y="14" width="25" height="32" rx="2" />
          <text x="40" y="32" fontSize="10" fill={strokeColor} textAnchor="middle">vs</text>
          <rect x="47" y="14" width="25" height="32" rx="2" />
        </svg>
      );
      
    case "diagram":
      return (
        <svg className={iconClass} viewBox="0 0 80 50" fill="none" stroke={strokeColor} strokeWidth={strokeWidth}>
          <line x1="25" y1="8" x2="55" y2="8" strokeWidth="2" />
          <rect x="15" y="15" width="50" height="30" rx="2" strokeDasharray="4 2" />
        </svg>
      );
      
    case "flowchart":
      return (
        <svg className={iconClass} viewBox="0 0 80 50" fill="none" stroke={strokeColor} strokeWidth={strokeWidth}>
          <line x1="25" y1="6" x2="55" y2="6" strokeWidth="2" />
          <rect x="5" y="18" width="18" height="12" rx="2" />
          <line x1="23" y1="24" x2="31" y2="24" />
          <polygon points="29,21 35,24 29,27" fill={strokeColor} />
          <rect x="31" y="18" width="18" height="12" rx="2" />
          <line x1="49" y1="24" x2="57" y2="24" />
          <polygon points="55,21 61,24 55,27" fill={strokeColor} />
          <rect x="57" y="18" width="18" height="12" rx="2" />
        </svg>
      );
      
    case "timeline":
      return (
        <svg className={iconClass} viewBox="0 0 80 50" fill="none" stroke={strokeColor} strokeWidth={strokeWidth}>
          <line x1="25" y1="8" x2="55" y2="8" strokeWidth="2" />
          <line x1="10" y1="28" x2="70" y2="28" />
          <circle cx="20" cy="28" r="4" fill={strokeColor} />
          <circle cx="40" cy="28" r="4" fill={strokeColor} />
          <circle cx="60" cy="28" r="4" fill={strokeColor} />
        </svg>
      );
      
    case "image-placeholder":
      return (
        <svg className={iconClass} viewBox="0 0 80 50" fill="none" stroke={strokeColor} strokeWidth={strokeWidth}>
          <line x1="25" y1="6" x2="55" y2="6" strokeWidth="2" />
          <rect x="15" y="12" width="50" height="32" rx="2" strokeDasharray="4 2" />
          <path d="M30 35 L40 25 L50 35" strokeWidth="1" />
          <circle cx="32" cy="22" r="4" />
        </svg>
      );
      
    case "quote":
      return (
        <svg className={iconClass} viewBox="0 0 80 50" fill="none" stroke={strokeColor} strokeWidth={strokeWidth}>
          <text x="12" y="22" fontSize="24" fill={strokeColor} opacity="0.5">"</text>
          <line x1="22" y1="22" x2="65" y2="22" />
          <line x1="22" y1="30" x2="55" y2="30" />
          <line x1="35" y1="40" x2="55" y2="40" opacity="0.6" />
        </svg>
      );
      
    case "equation":
      return (
        <svg className={iconClass} viewBox="0 0 80 50" fill="none" stroke={strokeColor} strokeWidth={strokeWidth}>
          <line x1="25" y1="8" x2="55" y2="8" strokeWidth="2" />
          <rect x="15" y="15" width="50" height="28" rx="2" strokeDasharray="4 2" />
          <text x="40" y="33" fontSize="12" fill={strokeColor} textAnchor="middle" fontStyle="italic">f(x)</text>
        </svg>
      );
      
    case "thank-you":
      return (
        <svg className={iconClass} viewBox="0 0 80 50" fill="none" stroke={strokeColor} strokeWidth={strokeWidth}>
          <line x1="15" y1="25" x2="65" y2="25" strokeWidth="4" />
        </svg>
      );
      
    default:
      return (
        <svg className={iconClass} viewBox="0 0 80 50" fill="none" stroke={strokeColor} strokeWidth={strokeWidth}>
          <rect x="10" y="10" width="60" height="30" rx="2" strokeDasharray="4 2" />
        </svg>
      );
  }
}
