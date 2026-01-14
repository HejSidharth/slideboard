import { nanoid } from "nanoid";
import type { ExcalidrawElement } from "@/types";

// Neutral color that works in both light and dark themes
const TEMPLATE_COLOR = "#64748b"; // Tailwind slate-500

// Base element properties shared by all elements
const baseElementProps = () => ({
  angle: 0,
  backgroundColor: "transparent",
  fillStyle: "hachure" as const,
  strokeWidth: 2,
  strokeStyle: "solid" as const,
  roughness: 1,
  opacity: 100,
  groupIds: [],
  roundness: null,
  seed: Math.floor(Math.random() * 100000),
  version: 1,
  versionNonce: Math.floor(Math.random() * 100000),
  isDeleted: false,
  boundElements: null,
  updated: Date.now(),
  link: null,
  locked: false,
});

// Text element helper
const createTextElement = (
  x: number,
  y: number,
  text: string,
  fontSize: number,
  options: { textAlign?: "left" | "center" | "right"; width?: number } = {}
): ExcalidrawElement => ({
  id: nanoid(),
  type: "text",
  x,
  y,
  width: options.width ?? text.length * fontSize * 0.6,
  height: fontSize * 1.2,
  strokeColor: TEMPLATE_COLOR,
  text,
  fontSize,
  fontFamily: 1,
  textAlign: options.textAlign ?? "left",
  verticalAlign: "top",
  baseline: Math.floor(fontSize * 0.9),
  lineHeight: 1.2,
  ...baseElementProps(),
  strokeWidth: 1,
  roughness: 0,
});

// Rectangle element helper
const createRectangleElement = (
  x: number,
  y: number,
  width: number,
  height: number,
  options: { strokeStyle?: "solid" | "dashed" | "dotted" } = {}
): ExcalidrawElement => ({
  id: nanoid(),
  type: "rectangle",
  x,
  y,
  width,
  height,
  strokeColor: TEMPLATE_COLOR,
  ...baseElementProps(),
  strokeStyle: options.strokeStyle ?? "solid",
});

// Line element helper
const createLineElement = (
  x: number,
  y: number,
  points: [number, number][]
): ExcalidrawElement => ({
  id: nanoid(),
  type: "line",
  x,
  y,
  width: Math.abs(points[points.length - 1][0] - points[0][0]),
  height: Math.abs(points[points.length - 1][1] - points[0][1]),
  strokeColor: TEMPLATE_COLOR,
  points,
  ...baseElementProps(),
});

// Arrow element helper
const createArrowElement = (
  x: number,
  y: number,
  points: [number, number][]
): ExcalidrawElement => ({
  id: nanoid(),
  type: "arrow",
  x,
  y,
  width: Math.abs(points[points.length - 1][0] - points[0][0]),
  height: Math.abs(points[points.length - 1][1] - points[0][1]),
  strokeColor: TEMPLATE_COLOR,
  points,
  lastCommittedPoint: points[points.length - 1],
  startArrowhead: null,
  endArrowhead: "arrow",
  ...baseElementProps(),
});

// Ellipse element helper
const createEllipseElement = (
  x: number,
  y: number,
  width: number,
  height: number
): ExcalidrawElement => ({
  id: nanoid(),
  type: "ellipse",
  x,
  y,
  width,
  height,
  strokeColor: TEMPLATE_COLOR,
  ...baseElementProps(),
});

// Template prompt definition
export interface TemplatePrompt {
  id: string;
  label: string;
  placeholder: string;
  defaultValue: string;
}

// Template definition
export interface SlideTemplateDefinition {
  id: string;
  name: string;
  description: string;
  prompts: TemplatePrompt[];
  generate: (values: Record<string, string>) => ExcalidrawElement[];
}

// Canvas center point (assuming 1920x1080 canvas, centered at origin)
const CX = 300;
const CY = 200;

// All template definitions
export const SLIDE_TEMPLATES: SlideTemplateDefinition[] = [
  {
    id: "blank",
    name: "Blank",
    description: "Empty canvas",
    prompts: [],
    generate: () => [],
  },
  {
    id: "title-only",
    name: "Title Only",
    description: "Large centered title",
    prompts: [
      { id: "title", label: "Title", placeholder: "Enter title", defaultValue: "Title" },
    ],
    generate: (values) => [
      createTextElement(CX - 100, CY - 20, values.title || "Title", 36, { textAlign: "center", width: 200 }),
    ],
  },
  {
    id: "title-subtitle",
    name: "Title + Subtitle",
    description: "Title with subtitle below",
    prompts: [
      { id: "title", label: "Title", placeholder: "Enter title", defaultValue: "Title" },
      { id: "subtitle", label: "Subtitle", placeholder: "Enter subtitle", defaultValue: "Subtitle" },
    ],
    generate: (values) => [
      createTextElement(CX - 120, CY - 40, values.title || "Title", 36, { textAlign: "center", width: 240 }),
      createTextElement(CX - 80, CY + 20, values.subtitle || "Subtitle", 20, { textAlign: "center", width: 160 }),
    ],
  },
  {
    id: "section-header",
    name: "Section Header",
    description: "Bold section divider",
    prompts: [
      { id: "section", label: "Section Name", placeholder: "Enter section name", defaultValue: "Section" },
    ],
    generate: (values) => [
      createLineElement(CX - 150, CY - 50, [[0, 0], [300, 0]]),
      createTextElement(CX - 80, CY - 30, values.section || "Section", 32, { textAlign: "center", width: 160 }),
      createLineElement(CX - 150, CY + 20, [[0, 0], [300, 0]]),
    ],
  },
  {
    id: "title-bullets",
    name: "Title + Bullets",
    description: "Title at top, bullet list area",
    prompts: [
      { id: "title", label: "Title", placeholder: "Enter title", defaultValue: "Title" },
    ],
    generate: (values) => [
      createTextElement(CX - 150, 60, values.title || "Title", 28, { width: 300 }),
      createLineElement(CX - 150, 100, [[0, 0], [300, 0]]),
      createEllipseElement(CX - 150, 130, 8, 8),
      createTextElement(CX - 135, 125, "Point one", 18),
      createEllipseElement(CX - 150, 165, 8, 8),
      createTextElement(CX - 135, 160, "Point two", 18),
      createEllipseElement(CX - 150, 200, 8, 8),
      createTextElement(CX - 135, 195, "Point three", 18),
    ],
  },
  {
    id: "two-columns",
    name: "Two Columns",
    description: "Title with two side-by-side areas",
    prompts: [
      { id: "title", label: "Title", placeholder: "Enter title", defaultValue: "Title" },
      { id: "left", label: "Left Label", placeholder: "Left column label", defaultValue: "Left" },
      { id: "right", label: "Right Label", placeholder: "Right column label", defaultValue: "Right" },
    ],
    generate: (values) => [
      createTextElement(CX - 120, 50, values.title || "Title", 28, { textAlign: "center", width: 240 }),
      createRectangleElement(CX - 160, 100, 140, 180),
      createTextElement(CX - 130, 110, values.left || "Left", 16, { textAlign: "center", width: 80 }),
      createRectangleElement(CX + 20, 100, 140, 180),
      createTextElement(CX + 50, 110, values.right || "Right", 16, { textAlign: "center", width: 80 }),
    ],
  },
  {
    id: "comparison",
    name: "Comparison",
    description: "Two options with vs in middle",
    prompts: [
      { id: "title", label: "Title", placeholder: "Enter title", defaultValue: "Comparison" },
      { id: "optionA", label: "Option A", placeholder: "First option", defaultValue: "Option A" },
      { id: "optionB", label: "Option B", placeholder: "Second option", defaultValue: "Option B" },
    ],
    generate: (values) => [
      createTextElement(CX - 100, 40, values.title || "Comparison", 28, { textAlign: "center", width: 200 }),
      createRectangleElement(CX - 170, 90, 130, 160),
      createTextElement(CX - 155, 100, values.optionA || "Option A", 16, { width: 100 }),
      createTextElement(CX - 20, CY, "vs", 24, { textAlign: "center", width: 40 }),
      createRectangleElement(CX + 40, 90, 130, 160),
      createTextElement(CX + 55, 100, values.optionB || "Option B", 16, { width: 100 }),
    ],
  },
  {
    id: "diagram",
    name: "Diagram",
    description: "Title with centered diagram area",
    prompts: [
      { id: "title", label: "Title", placeholder: "Enter title", defaultValue: "Diagram" },
    ],
    generate: (values) => [
      createTextElement(CX - 100, 40, values.title || "Diagram", 28, { textAlign: "center", width: 200 }),
      createRectangleElement(CX - 120, 90, 240, 200, { strokeStyle: "dashed" }),
      createTextElement(CX - 60, CY, "Diagram Area", 16, { textAlign: "center", width: 120 }),
    ],
  },
  {
    id: "flowchart",
    name: "Flowchart",
    description: "Three connected steps",
    prompts: [
      { id: "title", label: "Title", placeholder: "Enter title", defaultValue: "Process" },
      { id: "step1", label: "Step 1", placeholder: "First step", defaultValue: "Step 1" },
      { id: "step2", label: "Step 2", placeholder: "Second step", defaultValue: "Step 2" },
      { id: "step3", label: "Step 3", placeholder: "Third step", defaultValue: "Step 3" },
    ],
    generate: (values) => [
      createTextElement(CX - 80, 40, values.title || "Process", 28, { textAlign: "center", width: 160 }),
      // Step 1
      createRectangleElement(CX - 160, 100, 80, 50),
      createTextElement(CX - 150, 115, values.step1 || "Step 1", 14, { textAlign: "center", width: 60 }),
      // Arrow 1
      createArrowElement(CX - 80, 125, [[0, 0], [40, 0]]),
      // Step 2
      createRectangleElement(CX - 40, 100, 80, 50),
      createTextElement(CX - 30, 115, values.step2 || "Step 2", 14, { textAlign: "center", width: 60 }),
      // Arrow 2
      createArrowElement(CX + 40, 125, [[0, 0], [40, 0]]),
      // Step 3
      createRectangleElement(CX + 80, 100, 80, 50),
      createTextElement(CX + 90, 115, values.step3 || "Step 3", 14, { textAlign: "center", width: 60 }),
    ],
  },
  {
    id: "timeline",
    name: "Timeline",
    description: "Horizontal timeline with markers",
    prompts: [
      { id: "title", label: "Title", placeholder: "Enter title", defaultValue: "Timeline" },
    ],
    generate: (values) => [
      createTextElement(CX - 80, 40, values.title || "Timeline", 28, { textAlign: "center", width: 160 }),
      // Main line
      createLineElement(CX - 180, CY, [[0, 0], [360, 0]]),
      // Markers
      createEllipseElement(CX - 120 - 6, CY - 6, 12, 12),
      createTextElement(CX - 130, CY + 20, "Event 1", 14),
      createEllipseElement(CX - 6, CY - 6, 12, 12),
      createTextElement(CX - 20, CY + 20, "Event 2", 14),
      createEllipseElement(CX + 120 - 6, CY - 6, 12, 12),
      createTextElement(CX + 100, CY + 20, "Event 3", 14),
    ],
  },
  {
    id: "image-placeholder",
    name: "Image Placeholder",
    description: "Title with image area",
    prompts: [
      { id: "title", label: "Title", placeholder: "Enter title", defaultValue: "Title" },
      { id: "caption", label: "Caption", placeholder: "Image caption", defaultValue: "Image" },
    ],
    generate: (values) => [
      createTextElement(CX - 100, 40, values.title || "Title", 28, { textAlign: "center", width: 200 }),
      createRectangleElement(CX - 120, 90, 240, 180, { strokeStyle: "dashed" }),
      createTextElement(CX - 40, CY, values.caption || "Image", 18, { textAlign: "center", width: 80 }),
    ],
  },
  {
    id: "quote",
    name: "Quote",
    description: "Large quote with attribution",
    prompts: [
      { id: "quote", label: "Quote", placeholder: "Enter quote", defaultValue: "Quote goes here" },
      { id: "author", label: "Author", placeholder: "Author name", defaultValue: "Author" },
    ],
    generate: (values) => [
      createTextElement(CX - 180, CY - 60, '"', 72),
      createTextElement(CX - 140, CY - 30, values.quote || "Quote goes here", 22, { width: 280 }),
      createTextElement(CX - 140, CY + 40, `- ${values.author || "Author"}`, 16),
    ],
  },
  {
    id: "equation",
    name: "Equation",
    description: "Title with equation area",
    prompts: [
      { id: "title", label: "Title", placeholder: "Enter title", defaultValue: "Equation" },
    ],
    generate: (values) => [
      createTextElement(CX - 100, 50, values.title || "Equation", 28, { textAlign: "center", width: 200 }),
      createRectangleElement(CX - 140, 100, 280, 120, { strokeStyle: "dashed" }),
      createTextElement(CX - 80, CY - 10, "f(x) = ...", 24, { textAlign: "center", width: 160 }),
    ],
  },
  {
    id: "thank-you",
    name: "Thank You",
    description: "Closing slide",
    prompts: [
      { id: "message", label: "Message", placeholder: "Closing message", defaultValue: "Thank You" },
    ],
    generate: (values) => [
      createTextElement(CX - 120, CY - 30, values.message || "Thank You", 48, { textAlign: "center", width: 240 }),
    ],
  },
];

// Get a template by ID
export function getTemplateById(id: string): SlideTemplateDefinition | undefined {
  return SLIDE_TEMPLATES.find((t) => t.id === id);
}

// Generate elements from a template
export function generateTemplateElements(
  templateId: string,
  values: Record<string, string>
): ExcalidrawElement[] {
  const template = getTemplateById(templateId);
  if (!template) return [];
  return template.generate(values);
}
