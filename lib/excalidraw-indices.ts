import { generateNKeysBetween } from "fractional-indexing";
import type { ExcalidrawElement } from "@/types";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function getIntegerLength(head: string): number | null {
  if (head >= "a" && head <= "z") {
    return head.charCodeAt(0) - "a".charCodeAt(0) + 2;
  }

  if (head >= "A" && head <= "Z") {
    return "Z".charCodeAt(0) - head.charCodeAt(0) + 2;
  }

  return null;
}

function isValidOrderKey(key: unknown): key is string {
  if (typeof key !== "string" || key.length === 0) return false;

  const integerPartLength = getIntegerLength(key[0]);
  if (!integerPartLength || integerPartLength > key.length) return false;

  if (key === `A${BASE62[0].repeat(26)}`) return false;

  if (key.slice(integerPartLength).endsWith(BASE62[0])) return false;

  for (const char of key) {
    if (!BASE62.includes(char)) return false;
  }

  return true;
}

function getElementIndex(element: unknown): string | null {
  if (!element || typeof element !== "object") {
    return null;
  }

  const maybeIndex = (element as { index?: unknown }).index;
  return typeof maybeIndex === "string" ? maybeIndex : null;
}

export function hasInvalidExcalidrawIndices(
  elements: unknown,
): boolean {
  if (!Array.isArray(elements)) {
    return true;
  }

  let previous: string | null = null;

  for (const element of elements) {
    const index = getElementIndex(element);

    if (!isValidOrderKey(index)) {
      return true;
    }

    if (previous !== null && index <= previous) {
      return true;
    }

    previous = index;
  }

  return false;
}

export function sanitizeExcalidrawElementIndices(
  elements: unknown,
): { elements: readonly ExcalidrawElement[]; didRepair: boolean } {
  if (!Array.isArray(elements)) {
    return { elements: [], didRepair: true };
  }

  const objectElements = elements.filter(
    (element): element is ExcalidrawElement =>
      typeof element === "object" && element !== null,
  );

  const didRepairInvalidShape = objectElements.length !== elements.length;
  if (!didRepairInvalidShape && !hasInvalidExcalidrawIndices(objectElements)) {
    return { elements, didRepair: false };
  }

  if (objectElements.length === 0) {
    return { elements: [], didRepair: true };
  }

  const repairedIndices = generateNKeysBetween(null, null, objectElements.length);
  const repairedElements = objectElements.map((element, index) => ({
    ...element,
    index: repairedIndices[index],
  }));

  return { elements: repairedElements, didRepair: true };
}

export function getNextValidExcalidrawIndex(
  elements: readonly ExcalidrawElement[],
): string {
  const { elements: sanitized } = sanitizeExcalidrawElementIndices(elements);

  const sorted = sanitized
    .map(getElementIndex)
    .filter((value): value is string => typeof value === "string")
    .slice()
    .sort((a, b) => a.localeCompare(b));

  const previous = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  return generateNKeysBetween(previous, null, 1)[0];
}
