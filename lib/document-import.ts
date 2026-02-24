import { pdfToImages, imageFileToPageImage } from "./pdf-to-images";
import type { PageImage } from "./pdf-to-images";
import type { ExtractedProblem, ProblemBoundingBox } from "@/types";

export type ImportStage =
  | "idle"
  | "rendering"
  | "analyzing"
  | "cropping"
  | "complete"
  | "error";

export interface ImportProgress {
  stage: ImportStage;
  progress: number;
  message: string;
}

interface GrokPageResult {
  pageNumber: number;
  problems: {
    problemNumber: string;
    boundingBox: ProblemBoundingBox;
    description: string;
  }[];
}

interface GrokResponse {
  pages: GrokPageResult[];
}

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

const PPTX_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
]);

/**
 * Check if a file is a supported document type.
 */
export function isAcceptedFile(file: File): boolean {
  return (
    file.type === "application/pdf" || ACCEPTED_IMAGE_TYPES.has(file.type)
  );
}

/**
 * Check if a file is a PowerPoint file (unsupported, but we detect it for messaging).
 */
export function isPowerPointFile(file: File): boolean {
  return (
    PPTX_TYPES.has(file.type) ||
    file.name.endsWith(".pptx") ||
    file.name.endsWith(".ppt")
  );
}

/**
 * Crop a region from a page image based on a bounding box (percentages).
 * Returns a PNG data URL of the cropped region.
 */
function cropImage(
  pageImage: PageImage,
  boundingBox: ProblemBoundingBox,
): Promise<{ dataURL: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const srcX = (boundingBox.left / 100) * img.naturalWidth;
      const srcY = (boundingBox.top / 100) * img.naturalHeight;
      const srcW = (boundingBox.width / 100) * img.naturalWidth;
      const srcH = (boundingBox.height / 100) * img.naturalHeight;

      // Clamp values to image bounds
      const clampedX = Math.max(0, Math.round(srcX));
      const clampedY = Math.max(0, Math.round(srcY));
      const clampedW = Math.min(
        Math.round(srcW),
        img.naturalWidth - clampedX,
      );
      const clampedH = Math.min(
        Math.round(srcH),
        img.naturalHeight - clampedY,
      );

      if (clampedW <= 0 || clampedH <= 0) {
        reject(new Error("Cropped region has zero dimensions"));
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = clampedW;
      canvas.height = clampedH;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas 2d context"));
        return;
      }

      ctx.drawImage(
        img,
        clampedX,
        clampedY,
        clampedW,
        clampedH,
        0,
        0,
        clampedW,
        clampedH,
      );

      resolve({
        dataURL: canvas.toDataURL("image/jpeg", 0.8),
        width: clampedW,
        height: clampedH,
      });
    };
    img.onerror = () => reject(new Error("Failed to load image for cropping"));
    img.src = pageImage.dataURL;
  });
}

/**
 * Send page images to the Grok Vision API for problem extraction.
 */
async function analyzePages(pageImages: PageImage[]): Promise<GrokResponse> {
  const response = await fetch("/api/grok/extract-problems", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pageImages: pageImages.map((p) => p.dataURL),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(
      (error as { error?: string }).error ?? `API error: ${response.status}`,
    );
  }

  return response.json() as Promise<GrokResponse>;
}

/**
 * Full document import pipeline:
 * 1. Convert file to page images (PDF rendering or direct image load)
 * 2. Send pages to Grok Vision for problem identification
 * 3. Crop individual problems from page images
 * 4. Return array of ExtractedProblem objects ready for slide creation
 */
export async function extractProblemsFromDocument(
  file: File,
  onProgress?: (progress: ImportProgress) => void,
): Promise<ExtractedProblem[]> {
  const report = (stage: ImportStage, progress: number, message: string) => {
    onProgress?.({ stage, progress, message });
  };

  // Step 1: Convert to page images
  report("rendering", 0, "Preparing document...");

  let pageImages: PageImage[];

  if (file.type === "application/pdf") {
    pageImages = await pdfToImages(file, 1.5, (p) => {
      report("rendering", p * 0.3, `Rendering page ${Math.ceil(p * 100)}%...`);
    });
  } else if (ACCEPTED_IMAGE_TYPES.has(file.type)) {
    const pageImage = await imageFileToPageImage(file);
    pageImages = [pageImage];
    report("rendering", 0.3, "Image loaded");
  } else {
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  if (pageImages.length === 0) {
    throw new Error("No pages found in document");
  }

  // Step 2: Analyze with Grok Vision
  report("analyzing", 0.3, `Analyzing ${pageImages.length} page(s) with AI...`);

  const grokResult = await analyzePages(pageImages);

  report("analyzing", 0.7, "Analysis complete");

  // Step 3: Crop individual problems
  report("cropping", 0.7, "Extracting problems...");

  const allProblems: ExtractedProblem[] = [];
  let totalProblems = 0;

  for (const page of grokResult.pages) {
    totalProblems += page.problems.length;
  }

  if (totalProblems === 0) {
    // Fallback: treat each page as a single problem
    report("cropping", 0.8, "No individual problems detected, using full pages...");

    for (let i = 0; i < pageImages.length; i++) {
      allProblems.push({
        problemNumber: `Page ${i + 1}`,
        boundingBox: { top: 0, left: 0, width: 100, height: 100 },
        description: `Full page ${i + 1}`,
        croppedImageDataURL: pageImages[i].dataURL,
        sourcePageIndex: i,
        width: pageImages[i].width,
        height: pageImages[i].height,
      });
    }
  } else {
    let processed = 0;

    for (const page of grokResult.pages) {
      const pageImage = pageImages[page.pageNumber - 1];
      if (!pageImage) continue;

      for (const problem of page.problems) {
        try {
          const cropped = await cropImage(pageImage, problem.boundingBox);
          allProblems.push({
            problemNumber: problem.problemNumber,
            boundingBox: problem.boundingBox,
            description: problem.description,
            croppedImageDataURL: cropped.dataURL,
            sourcePageIndex: page.pageNumber - 1,
            width: cropped.width,
            height: cropped.height,
          });
        } catch (error) {
          console.error(
            `Failed to crop problem ${problem.problemNumber} from page ${page.pageNumber}:`,
            error,
          );
        }

        processed++;
        const cropProgress = 0.7 + (processed / totalProblems) * 0.3;
        report(
          "cropping",
          cropProgress,
          `Cropping problem ${processed}/${totalProblems}...`,
        );
      }
    }
  }

  report("complete", 1, `Extracted ${allProblems.length} problem(s)`);

  return allProblems;
}

/**
 * Simplified document import pipeline — one page per slide, no AI.
 * 1. Convert file to page images (PDF rendering or direct image load)
 * 2. Return one ExtractedProblem per page (full-page image)
 */
export async function importDocumentAsSlides(
  file: File,
  onProgress?: (progress: ImportProgress) => void,
): Promise<ExtractedProblem[]> {
  const report = (stage: ImportStage, progress: number, message: string) => {
    onProgress?.({ stage, progress, message });
  };

  report("rendering", 0, "Preparing document...");

  let pageImages: PageImage[];

  if (file.type === "application/pdf") {
    pageImages = await pdfToImages(file, 1.5, (p) => {
      report("rendering", p * 0.9, `Rendering page ${Math.ceil(p * 100)}%...`);
    });
  } else if (ACCEPTED_IMAGE_TYPES.has(file.type)) {
    const pageImage = await imageFileToPageImage(file);
    pageImages = [pageImage];
    report("rendering", 0.9, "Image loaded");
  } else {
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  if (pageImages.length === 0) {
    throw new Error("No pages found in document");
  }

  report("rendering", 0.95, `Creating ${pageImages.length} slide(s)...`);

  const slides: ExtractedProblem[] = pageImages.map((page, i) => ({
    problemNumber: `Page ${i + 1}`,
    boundingBox: { top: 0, left: 0, width: 100, height: 100 },
    description: `Page ${i + 1}`,
    croppedImageDataURL: page.dataURL,
    sourcePageIndex: i,
    width: page.width,
    height: page.height,
  }));

  report("complete", 1, `Created ${slides.length} slide(s)`);

  return slides;
}
