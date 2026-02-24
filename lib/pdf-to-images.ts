// Worker is served from public/pdf.worker.min.mjs (copied from node_modules/pdfjs-dist/build/).
const WORKER_URL = "/pdf.worker.min.mjs";

let pdfjsLib: typeof import("pdfjs-dist") | null = null;

async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
  return pdfjsLib;
}

export interface PageImage {
  dataURL: string;
  width: number;
  height: number;
  pageNumber: number;
}

/**
 * Render all pages of a PDF file to PNG data URLs.
 * Runs entirely client-side using pdf.js.
 *
 * @param file   The PDF File object selected by the user.
 * @param scale  Render scale factor (2 = ~200 DPI for standard PDFs).
 * @param onProgress  Optional callback reporting progress (0-1).
 * @returns Array of PageImage objects, one per page.
 */
export async function pdfToImages(
  file: File,
  scale = 1.5,
  onProgress?: (progress: number) => void,
): Promise<PageImage[]> {
  const pdfjs = await getPdfjs();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const images: PageImage[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvas, viewport }).promise;

    images.push({
      dataURL: canvas.toDataURL("image/jpeg", 0.8),
      width: viewport.width,
      height: viewport.height,
      pageNumber: i,
    });

    onProgress?.((i / totalPages));
  }

  return images;
}

/**
 * Convert a single image file (jpg/png) to a PageImage object.
 */
export function imageFileToPageImage(file: File): Promise<PageImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        resolve({
          dataURL: reader.result as string,
          width: img.naturalWidth,
          height: img.naturalHeight,
          pageNumber: 1,
        });
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
