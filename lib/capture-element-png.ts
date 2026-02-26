import { toPng } from "html-to-image";

export interface CapturedPng {
  dataUrl: string;
  width: number;
  height: number;
}

function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      reject(new Error("Failed to decode generated PNG."));
    };
    image.src = dataUrl;
  });
}

export async function captureElementAsPng(node: HTMLElement): Promise<CapturedPng> {
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }

  const pixelRatio = Math.max(2, Math.min(window.devicePixelRatio || 1, 3));
  const captureWidth = Math.max(node.scrollWidth, node.clientWidth, 1);
  const captureHeight = Math.max(node.scrollHeight, node.clientHeight, 1);

  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio,
    width: captureWidth,
    height: captureHeight,
    style: {
      width: `${captureWidth}px`,
      maxWidth: "none",
      overflow: "visible",
    },
    filter: (domNode) => {
      if (!(domNode instanceof HTMLElement)) return true;
      return !domNode.classList.contains("chat-message-actions");
    },
  });

  const dimensions = await loadImageDimensions(dataUrl);
  return {
    dataUrl,
    width: dimensions.width,
    height: dimensions.height,
  };
}
