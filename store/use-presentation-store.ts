"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type {
  AppState,
  BinaryFiles,
  CanvasEngine,
  EmbedProvider,
  EmbedRenderMode,
  ExcalidrawElement,
  ExtractedProblem,
  Folder,
  Presentation,
  PresentationStore,
  SlideData,
  SlideMcqDraft,
  SlideMcqCanvasAsset,
  EmbedSlideData,
  TldrawSlideData,
  ExcalidrawSlideData,
} from "@/types";
import { CURRENT_SCHEMA_VERSION } from "@/types";
import type { StoreSnapshot, TLRecord } from "tldraw";
import {
  setSlideSnapshot,
  deleteSlideSnapshot,
  deleteSlideSnapshotsByPresentation,
  setPresentationMeta,
  deletePresentationMeta,
  type StoredSlideSnapshot,
} from "@/lib/slide-cache";
import { sanitizeExcalidrawElementIndices } from "@/lib/excalidraw-indices";

const PERSIST_VERSION = 8;

const EXCALIDRAW_DEFAULT_APP_STATE: Partial<AppState> = {
  currentItemStrokeWidth: 1,
};

function createExcalidrawDefaultAppState(overrides: Partial<AppState> = {}): Partial<AppState> {
  return {
    ...overrides,
    ...EXCALIDRAW_DEFAULT_APP_STATE,
  };
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// ---------------------------------------------------------------------------
// IndexedDB persistence helpers
// ---------------------------------------------------------------------------

/**
 * Persist a slide's canvas data to IndexedDB (the real storage layer for
 * canvas content). localStorage only holds tiny metadata now.
 */
function persistSlideToCache(
  slide: SlideData,
  presentationId: string,
  slideIndex: number,
): void {
  const snapshot: StoredSlideSnapshot = {
    slideId: slide.id,
    presentationId,
    slideIndex,
    engine: slide.engine,
    sceneVersion: slide.sceneVersion,
    snapshotJson: slide.engine === "tldraw" && slide.snapshot
      ? JSON.stringify(slide.snapshot)
      : null,
    elementsJson: slide.engine === "excalidraw"
      ? JSON.stringify(slide.elements)
      : null,
    appStateJson: slide.engine === "excalidraw"
      ? JSON.stringify(slide.appState)
      : null,
    filesJson: slide.engine === "excalidraw"
      ? JSON.stringify(slide.files)
      : null,
    slideQuestionDraftJson: slide.slideQuestionDraft
      ? JSON.stringify(slide.slideQuestionDraft)
      : null,
    slideQuestionAssetJson: slide.slideQuestionAsset
      ? JSON.stringify(slide.slideQuestionAsset)
      : null,
    provider: slide.engine === "embed" ? slide.provider : undefined,
    url: slide.engine === "embed" ? slide.url : undefined,
    embedUrl: slide.engine === "embed" ? slide.embedUrl : undefined,
    title: slide.engine === "embed" ? slide.title : undefined,
    renderMode: slide.engine === "embed" ? slide.renderMode : undefined,
    createdAt: slide.createdAt,
    updatedAt: slide.updatedAt,
    syncedAt: null,
  };
  // Fire-and-forget — don't block the Zustand update
  setSlideSnapshot(snapshot).catch((err) =>
    console.error("[store] Failed to persist slide to IndexedDB", err),
  );
}

/**
 * Persist presentation metadata to IndexedDB (used by sync layer).
 */
function persistMetaToCache(presentation: Presentation): void {
  setPresentationMeta({
    presentationId: presentation.id,
    name: presentation.name,
    canvasEngine: presentation.canvasEngine,
    folderId: presentation.folderId,
    currentSlideIndex: presentation.currentSlideIndex,
    slideIds: presentation.slides.map((s) => s.id),
    version: presentation.version,
    createdAt: presentation.createdAt,
    updatedAt: presentation.updatedAt,
    syncedAt: null,
    cloudSynced: false,
  }).catch((err) =>
    console.error("[store] Failed to persist presentation meta to IndexedDB", err),
  );
}

const createEmptySlide = (engine: CanvasEngine): SlideData => {
  if (engine === "excalidraw") {
    return {
      id: nanoid(),
      engine,
      sceneVersion: 0,
      elements: [],
      appState: createExcalidrawDefaultAppState(),
      files: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  return {
    id: nanoid(),
    engine,
    sceneVersion: 0,
    snapshot: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

const createEmbedSlide = (input: {
  provider: EmbedProvider;
  url: string;
  embedUrl: string | null;
  title: string;
  renderMode: EmbedRenderMode;
}): EmbedSlideData => ({
  id: nanoid(),
  engine: "embed",
  sceneVersion: 0,
  provider: input.provider,
  url: input.url,
  embedUrl: input.embedUrl,
  title: input.title,
  renderMode: input.renderMode,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

/**
 * Canvas dimensions for positioning imported images.
 * Excalidraw uses virtual coordinates; we center images in a
 * reasonable viewport area.
 */
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const PADDING = 40;

function createExcalidrawSlideFromProblem(problem: ExtractedProblem): ExcalidrawSlideData {
  const fileId = nanoid();
  const elementId = nanoid();

  // Scale image to fit within the canvas with padding
  const maxW = CANVAS_WIDTH - PADDING * 2;
  const maxH = CANVAS_HEIGHT - PADDING * 2;
  const scale = Math.min(maxW / problem.width, maxH / problem.height, 1);
  const displayW = Math.round(problem.width * scale);
  const displayH = Math.round(problem.height * scale);

  // Center on canvas
  const x = Math.round((CANVAS_WIDTH - displayW) / 2);
  const y = Math.round((CANVAS_HEIGHT - displayH) / 2);

  const imageElement: ExcalidrawElement = {
    type: "image",
    version: 1,
    versionNonce: Math.floor(Math.random() * 2147483647),
    index: "a0",
    isDeleted: false,
    id: elementId,
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    angle: 0,
    x,
    y,
    strokeColor: "transparent",
    backgroundColor: "transparent",
    width: displayW,
    height: displayH,
    seed: Math.floor(Math.random() * 2147483647),
    groupIds: [],
    frameId: null,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    roundness: null,
    fileId,
    status: "saved",
    scale: [1, 1],
    crop: null,
  };

  const files: BinaryFiles = {
    [fileId]: {
      mimeType: "image/jpeg",
      id: fileId,
      dataURL: problem.croppedImageDataURL,
      created: Date.now(),
    },
  };

  return {
    id: nanoid(),
    engine: "excalidraw",
    sceneVersion: 0,
    elements: [imageElement],
    appState: createExcalidrawDefaultAppState({
      scrollX: 0,
      scrollY: 0,
      zoom: { value: 1 },
    }),
    files,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function createTldrawSlideFromProblem(problem: ExtractedProblem): TldrawSlideData {
  const assetId = `asset:${nanoid()}`;
  const shapeId = `shape:${nanoid()}`;

  // Scale image to fit
  const maxW = CANVAS_WIDTH - PADDING * 2;
  const maxH = CANVAS_HEIGHT - PADDING * 2;
  const scale = Math.min(maxW / problem.width, maxH / problem.height, 1);
  const displayW = Math.round(problem.width * scale);
  const displayH = Math.round(problem.height * scale);
  const x = Math.round((CANVAS_WIDTH - displayW) / 2);
  const y = Math.round((CANVAS_HEIGHT - displayH) / 2);

  const snapshot: StoreSnapshot<TLRecord> = {
    store: {
      [assetId]: {
        id: assetId,
        typeName: "asset",
        type: "image",
        props: {
          name: `problem-${problem.problemNumber}.png`,
          src: problem.croppedImageDataURL,
          w: problem.width,
          h: problem.height,
          mimeType: "image/jpeg",
          isAnimated: false,
        },
        meta: {},
      } as unknown as TLRecord,
      [shapeId]: {
        id: shapeId,
        typeName: "shape",
        type: "image",
        x,
        y,
        rotation: 0,
        index: "a1",
        parentId: "page:page",
        isLocked: false,
        opacity: 1,
        props: {
          w: displayW,
          h: displayH,
          assetId,
          playing: true,
          url: "",
          crop: null,
          flipX: false,
          flipY: false,
          altText: `Problem ${problem.problemNumber}`,
        },
        meta: {},
      } as unknown as TLRecord,
    },
    schema: {
      schemaVersion: 2,
      sequences: {},
    },
  };

  return {
    id: nanoid(),
    engine: "tldraw",
    sceneVersion: 0,
    snapshot,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

const createResetState = (): Pick<PresentationStore, "folders" | "presentations" | "currentPresentationId"> => ({
  folders: [],
  presentations: [],
  currentPresentationId: null,
});

function isStoreSnapshot(value: unknown): value is StoreSnapshot<TLRecord> {
  if (!value || typeof value !== "object") return false;
  return "schema" in value && "store" in value;
}

function isExcalidrawElements(value: unknown): value is readonly ExcalidrawElement[] {
  return Array.isArray(value);
}

function normalizeSlideQuestionDraft(value: unknown): SlideMcqDraft | undefined {
  if (!value || typeof value !== "object") return undefined;
  const draft = value as Partial<SlideMcqDraft>;
  if (typeof draft.prompt !== "string" || !Array.isArray(draft.options)) {
    return undefined;
  }

  const options = draft.options
    .filter((option): option is string => typeof option === "string")
    .map((option) => option.trim())
    .filter(Boolean);

  if (options.length < 2) return undefined;

  return {
    prompt: draft.prompt,
    options,
    correctIndex:
      typeof draft.correctIndex === "number" &&
      draft.correctIndex >= 0 &&
      draft.correctIndex < options.length
        ? draft.correctIndex
        : null,
  };
}

function normalizeSlideQuestionAsset(value: unknown): SlideMcqCanvasAsset | undefined {
  if (!value || typeof value !== "object") return undefined;
  const asset = value as Partial<SlideMcqCanvasAsset>;
  if (asset.engine !== "tldraw" && asset.engine !== "excalidraw") {
    return undefined;
  }

  return {
    engine: asset.engine,
    shapeId: typeof asset.shapeId === "string" ? asset.shapeId : undefined,
    assetId: typeof asset.assetId === "string" ? asset.assetId : undefined,
    elementId: typeof asset.elementId === "string" ? asset.elementId : undefined,
    fileId: typeof asset.fileId === "string" ? asset.fileId : undefined,
  };
}

function normalizeSlideData(rawSlide: unknown, fallbackEngine: CanvasEngine): SlideData {
  const timestamp = Date.now();
  const slide = rawSlide as Partial<SlideData> | undefined;
  const slideQuestionDraft = normalizeSlideQuestionDraft(
    (slide as { slideQuestionDraft?: unknown } | undefined)?.slideQuestionDraft,
  );
  const slideQuestionAsset = normalizeSlideQuestionAsset(
    (slide as { slideQuestionAsset?: unknown } | undefined)?.slideQuestionAsset,
  );

  if (slide?.engine === "embed") {
    return {
      id: typeof slide.id === "string" ? slide.id : nanoid(),
      engine: "embed",
      sceneVersion:
        typeof slide.sceneVersion === "number"
          ? slide.sceneVersion
          : 0,
      provider:
        slide.provider === "generic" ||
        slide.provider === "kahoot" ||
        slide.provider === "gimkit" ||
        slide.provider === "quizizz" ||
        slide.provider === "youtube"
          ? slide.provider
          : "generic",
      url: typeof slide.url === "string" ? slide.url : "",
      embedUrl: typeof slide.embedUrl === "string" ? slide.embedUrl : null,
      title: typeof slide.title === "string" && slide.title.trim()
        ? slide.title
        : "Embedded activity",
      renderMode: slide.renderMode === "embed" ? "embed" : "launch-only",
      slideQuestionDraft,
      slideQuestionAsset,
      createdAt:
        typeof slide.createdAt === "number" ? slide.createdAt : timestamp,
      updatedAt:
        typeof slide.updatedAt === "number" ? slide.updatedAt : timestamp,
    };
  }

  const hasExcalidrawData = !!slide && (slide.engine === "excalidraw" || "elements" in slide);
  const engine: CanvasEngine = hasExcalidrawData ? "excalidraw" : fallbackEngine;

  if (engine === "excalidraw") {
    const parsedElements = isExcalidrawElements((slide as { elements?: unknown })?.elements)
      ? ((slide as { elements: readonly ExcalidrawElement[] }).elements)
      : [];
    const { elements: normalizedElements } = sanitizeExcalidrawElementIndices(parsedElements);

    return {
      id: nanoid(),
      engine,
      sceneVersion:
        typeof (slide as { sceneVersion?: unknown })?.sceneVersion === "number"
          ? ((slide as { sceneVersion: number }).sceneVersion)
          : 0,
      elements: normalizedElements,
      appState:
        slide && typeof (slide as { appState?: unknown }).appState === "object" && (slide as { appState?: unknown }).appState
          ? createExcalidrawDefaultAppState((slide as { appState: Partial<AppState> }).appState)
          : createExcalidrawDefaultAppState(),
      files:
        slide && typeof (slide as { files?: unknown }).files === "object" && (slide as { files?: unknown }).files
          ? ((slide as { files: BinaryFiles }).files)
          : {},
      problemBaselineElements: isExcalidrawElements((slide as { problemBaselineElements?: unknown })?.problemBaselineElements)
        ? ((slide as { problemBaselineElements: readonly ExcalidrawElement[] }).problemBaselineElements)
        : undefined,
      problemBaselineAppState:
        slide && typeof (slide as { problemBaselineAppState?: unknown }).problemBaselineAppState === "object"
          ? ((slide as { problemBaselineAppState: Partial<AppState> }).problemBaselineAppState)
          : undefined,
      problemBaselineFiles:
        slide && typeof (slide as { problemBaselineFiles?: unknown }).problemBaselineFiles === "object"
          ? ((slide as { problemBaselineFiles: BinaryFiles }).problemBaselineFiles)
          : undefined,
      problemBaselineUpdatedAt:
        typeof (slide as { problemBaselineUpdatedAt?: unknown })?.problemBaselineUpdatedAt === "number"
          ? ((slide as { problemBaselineUpdatedAt: number }).problemBaselineUpdatedAt)
          : undefined,
      slideQuestionDraft,
      slideQuestionAsset,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  return {
    id: nanoid(),
    engine: "tldraw",
    sceneVersion:
      typeof (slide as { sceneVersion?: unknown })?.sceneVersion === "number"
        ? ((slide as { sceneVersion: number }).sceneVersion)
        : 0,
    snapshot: slide && isStoreSnapshot((slide as { snapshot?: unknown }).snapshot)
      ? ((slide as { snapshot: StoreSnapshot<TLRecord> }).snapshot)
      : null,
    problemBaselineSnapshot: slide && isStoreSnapshot((slide as { problemBaselineSnapshot?: unknown }).problemBaselineSnapshot)
      ? ((slide as { problemBaselineSnapshot: StoreSnapshot<TLRecord> }).problemBaselineSnapshot)
      : undefined,
    problemBaselineUpdatedAt:
      typeof (slide as { problemBaselineUpdatedAt?: unknown })?.problemBaselineUpdatedAt === "number"
        ? ((slide as { problemBaselineUpdatedAt: number }).problemBaselineUpdatedAt)
        : undefined,
    slideQuestionDraft,
    slideQuestionAsset,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

const createDefaultPresentation = (
  name: string,
  folderId: string | null = null,
  canvasEngine: CanvasEngine = "tldraw",
): Presentation => ({
  id: nanoid(),
  name,
  canvasEngine,
  folderId,
  slides: [createEmptySlide(canvasEngine)],
  currentSlideIndex: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  version: CURRENT_SCHEMA_VERSION,
});

export const usePresentationStore = create<PresentationStore>()(
  persist(
    (set, get) => ({
      folders: [],
      presentations: [],
      currentPresentationId: null,      createPresentation: (name: string, folderId: string | null = null, canvasEngine: CanvasEngine = "tldraw") => {
        const presentation = createDefaultPresentation(name, folderId, canvasEngine);
        set((state) => ({
          presentations: [...state.presentations, presentation],
          currentPresentationId: presentation.id,
        }));
        // Persist to IndexedDB
        persistMetaToCache(presentation);
        presentation.slides.forEach((slide, i) =>
          persistSlideToCache(slide, presentation.id, i),
        );
        return presentation.id;
      },

      deletePresentation: (id: string) => {
        set((state) => ({
          presentations: state.presentations.filter((p) => p.id !== id),
          currentPresentationId:
            state.currentPresentationId === id
              ? null
              : state.currentPresentationId,
        }));
        // Clean up IndexedDB
        deleteSlideSnapshotsByPresentation(id).catch(console.error);
        deletePresentationMeta(id).catch(console.error);
      },

      renamePresentation: (id: string, name: string) => {
        set((state) => ({
          presentations: state.presentations.map((p) =>
            p.id === id ? { ...p, name, updatedAt: Date.now() } : p
          ),
        }));
        const updated = get().presentations.find((p) => p.id === id);
        if (updated) persistMetaToCache(updated);
      },

      movePresentationToFolder: (id: string, folderId: string | null) => {
        set((state) => ({
          presentations: state.presentations.map((p) =>
            p.id === id ? { ...p, folderId, updatedAt: Date.now() } : p
          ),
        }));
        const updated = get().presentations.find((p) => p.id === id);
        if (updated) persistMetaToCache(updated);
      },

      createFolder: (name: string, parentId: string | null = null) => {
        const folder: Folder = {
          id: nanoid(),
          name,
          parentId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          folders: [...state.folders, folder],
        }));

        return folder.id;
      },

      renameFolder: (id: string, name: string) => {
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === id ? { ...f, name, updatedAt: Date.now() } : f
          ),
        }));
      },

      deleteFolder: (id: string) => {
        set((state) => {
          const folderIdsToDelete = new Set<string>([id]);
          let changed = true;

          while (changed) {
            changed = false;
            for (const folder of state.folders) {
              if (folder.parentId && folderIdsToDelete.has(folder.parentId) && !folderIdsToDelete.has(folder.id)) {
                folderIdsToDelete.add(folder.id);
                changed = true;
              }
            }
          }

          return {
            folders: state.folders.filter((folder) => !folderIdsToDelete.has(folder.id)),
            presentations: state.presentations.map((presentation) =>
              presentation.folderId && folderIdsToDelete.has(presentation.folderId)
                ? { ...presentation, folderId: null, updatedAt: Date.now() }
                : presentation
            ),
          };
        });
      },

      duplicatePresentation: (id: string) => {
        const presentation = get().presentations.find((p) => p.id === id);
        if (!presentation) return "";

        const newPresentation: Presentation = {
          ...JSON.parse(JSON.stringify(presentation)),
          id: nanoid(),
          name: `${presentation.name} (Copy)`,
          folderId: presentation.folderId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          slides: presentation.slides.map((s) => ({
            ...JSON.parse(JSON.stringify(s)),
            id: nanoid(),
          })),
          version: CURRENT_SCHEMA_VERSION,
        };

        set((state) => ({
          presentations: [...state.presentations, newPresentation],
        }));

        // Persist new presentation to IndexedDB
        persistMetaToCache(newPresentation);
        newPresentation.slides.forEach((slide, i) =>
          persistSlideToCache(slide, newPresentation.id, i),
        );

        return newPresentation.id;
      },

      setCurrentPresentation: (id: string | null) => {
        set({ currentPresentationId: id });
      },

      getCurrentPresentation: () => {
        const { presentations, currentPresentationId } = get();
        return presentations.find((p) => p.id === currentPresentationId) || null;
      },

      addSlide: (presentationId: string) => {
        set((state) => ({
          presentations: state.presentations.map((p) => {
            if (p.id !== presentationId) return p;
            const newSlide = createEmptySlide(p.canvasEngine);
            const newSlides = [
              ...p.slides.slice(0, p.currentSlideIndex + 1),
              newSlide,
              ...p.slides.slice(p.currentSlideIndex + 1),
            ];
            const insertedIndex = p.currentSlideIndex + 1;
            // Persist new slide + updated meta to IndexedDB
            persistSlideToCache(newSlide, p.id, insertedIndex);
            // Re-index all slides after the insertion point
            newSlides.forEach((s, i) => {
              if (i > insertedIndex) persistSlideToCache(s, p.id, i);
            });
            const updated = { ...p, slides: newSlides, currentSlideIndex: insertedIndex, updatedAt: Date.now() };
            persistMetaToCache(updated);
            return updated;
          }),
        }));
      },

      addEmbedSlide: (presentationId, input) => {
        set((state) => ({
          presentations: state.presentations.map((p) => {
            if (p.id !== presentationId) return p;

            const newSlide = createEmbedSlide(input);
            const newSlides = [
              ...p.slides.slice(0, p.currentSlideIndex + 1),
              newSlide,
              ...p.slides.slice(p.currentSlideIndex + 1),
            ];
            const insertedIndex = p.currentSlideIndex + 1;
            persistSlideToCache(newSlide, p.id, insertedIndex);
            newSlides.forEach((slide, index) => {
              if (index > insertedIndex) {
                persistSlideToCache(slide, p.id, index);
              }
            });
            const updated = {
              ...p,
              slides: newSlides,
              currentSlideIndex: insertedIndex,
              updatedAt: Date.now(),
            };
            persistMetaToCache(updated);
            return updated;
          }),
        }));
      },

      deleteSlide: (presentationId: string, slideIndex: number) => {
        let deletedSlideId: string | null = null;
        set((state) => ({
          presentations: state.presentations.map((p) => {
            if (p.id !== presentationId) return p;
            if (p.slides.length <= 1) return p;

            deletedSlideId = p.slides[slideIndex]?.id ?? null;
            const newSlides = p.slides.filter((_, i) => i !== slideIndex);
            const newCurrentIndex = Math.min(
              p.currentSlideIndex,
              newSlides.length - 1
            );
            const updated = {
              ...p,
              slides: newSlides,
              currentSlideIndex: newCurrentIndex >= 0 ? newCurrentIndex : 0,
              updatedAt: Date.now(),
            };
            // Re-index remaining slides in IndexedDB
            newSlides.forEach((s, i) => persistSlideToCache(s, p.id, i));
            persistMetaToCache(updated);
            return updated;
          }),
        }));
        if (deletedSlideId) {
          deleteSlideSnapshot(deletedSlideId).catch(console.error);
        }
      },

      duplicateSlide: (presentationId: string, slideIndex: number) => {
        set((state) => ({
          presentations: state.presentations.map((p) => {
            if (p.id !== presentationId) return p;

            const slideToClone = p.slides[slideIndex];
            if (!slideToClone) return p;

            const clonedSlide: SlideData = {
              ...JSON.parse(JSON.stringify(slideToClone)),
              id: nanoid(),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            const newSlides = [
              ...p.slides.slice(0, slideIndex + 1),
              clonedSlide,
              ...p.slides.slice(slideIndex + 1),
            ];

            const updated = {
              ...p,
              slides: newSlides,
              currentSlideIndex: slideIndex + 1,
              updatedAt: Date.now(),
            };
            // Persist cloned slide and re-index all slides after insertion
            newSlides.forEach((s, i) => {
              if (i >= slideIndex + 1) persistSlideToCache(s, p.id, i);
            });
            persistMetaToCache(updated);
            return updated;
          }),
        }));
      },

      reorderSlides: (
        presentationId: string,
        fromIndex: number,
        toIndex: number
      ) => {
        set((state) => ({
          presentations: state.presentations.map((p) => {
            if (p.id !== presentationId) return p;

            const newSlides = [...p.slides];
            const [movedSlide] = newSlides.splice(fromIndex, 1);
            newSlides.splice(toIndex, 0, movedSlide);

            let newCurrentIndex = p.currentSlideIndex;
            if (p.currentSlideIndex === fromIndex) {
              newCurrentIndex = toIndex;
            } else if (
              fromIndex < p.currentSlideIndex &&
              toIndex >= p.currentSlideIndex
            ) {
              newCurrentIndex--;
            } else if (
              fromIndex > p.currentSlideIndex &&
              toIndex <= p.currentSlideIndex
            ) {
              newCurrentIndex++;
            }

            const updated = {
              ...p,
              slides: newSlides,
              currentSlideIndex: newCurrentIndex,
              updatedAt: Date.now(),
            };
            // Re-index all slides in IndexedDB to reflect new order
            newSlides.forEach((s, i) => persistSlideToCache(s, p.id, i));
            persistMetaToCache(updated);
            return updated;
          }),
        }));
      },

      updateSlide: (
        presentationId: string,
        slideIndex: number,
        data: Partial<SlideData>
      ) => {
        set((state) => ({
          presentations: state.presentations.map((p) => {
            if (p.id !== presentationId) return p;

            const newSlides = p.slides.map((s, i) => {
              if (i !== slideIndex) return s;
              const updated =
                s.engine === "tldraw"
                  ? {
                      ...s,
                      snapshot: "snapshot" in data ? (data as Partial<TldrawSlideData>).snapshot ?? null : s.snapshot,
                      slideQuestionDraft:
                        "slideQuestionDraft" in data
                          ? (data as Partial<SlideData>).slideQuestionDraft
                          : s.slideQuestionDraft,
                      slideQuestionAsset:
                        "slideQuestionAsset" in data
                          ? (data as Partial<SlideData>).slideQuestionAsset
                          : s.slideQuestionAsset,
                      updatedAt: Date.now(),
                    }
                  : s.engine === "excalidraw"
                  ? {
                      ...s,
                      elements: "elements" in data ? (data as Partial<ExcalidrawSlideData>).elements ?? [] : s.elements,
                      appState: "appState" in data ? (data as Partial<ExcalidrawSlideData>).appState ?? {} : s.appState,
                      files: "files" in data ? (data as Partial<ExcalidrawSlideData>).files ?? {} : s.files,
                      slideQuestionDraft:
                        "slideQuestionDraft" in data
                          ? (data as Partial<SlideData>).slideQuestionDraft
                          : s.slideQuestionDraft,
                      slideQuestionAsset:
                        "slideQuestionAsset" in data
                          ? (data as Partial<SlideData>).slideQuestionAsset
                          : s.slideQuestionAsset,
                      updatedAt: Date.now(),
                    }
                  : {
                      ...s,
                      provider: "provider" in data ? (data as Partial<EmbedSlideData>).provider ?? s.provider : s.provider,
                      url: "url" in data ? (data as Partial<EmbedSlideData>).url ?? s.url : s.url,
                      embedUrl: "embedUrl" in data ? (data as Partial<EmbedSlideData>).embedUrl ?? null : s.embedUrl,
                      title: "title" in data ? (data as Partial<EmbedSlideData>).title ?? s.title : s.title,
                      renderMode: "renderMode" in data ? (data as Partial<EmbedSlideData>).renderMode ?? s.renderMode : s.renderMode,
                      slideQuestionDraft:
                        "slideQuestionDraft" in data
                          ? (data as Partial<SlideData>).slideQuestionDraft
                          : s.slideQuestionDraft,
                      slideQuestionAsset:
                        "slideQuestionAsset" in data
                          ? (data as Partial<SlideData>).slideQuestionAsset
                          : s.slideQuestionAsset,
                      updatedAt: Date.now(),
                    };
              persistSlideToCache(updated, p.id, i);
              return updated;
            });

            return {
              ...p,
              slides: newSlides,
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      clearSlide: (presentationId: string, slideIndex: number) => {
        set((state) => ({
          presentations: state.presentations.map((p) => {
            if (p.id !== presentationId) return p;

            const existingSlide = p.slides[slideIndex];
            const clearedSlide: SlideData =
              existingSlide?.engine === "embed"
                ? {
                    ...createEmptySlide(p.canvasEngine),
                    id: existingSlide.id,
                    createdAt: existingSlide.createdAt,
                    updatedAt: Date.now(),
                    sceneVersion: (existingSlide.sceneVersion ?? 0) + 1,
                  }
                : p.canvasEngine === "excalidraw"
                ? {
                    id: existingSlide?.id ?? nanoid(),
                    engine: "excalidraw" as const,
                    sceneVersion: (existingSlide?.sceneVersion ?? 0) + 1,
                    elements: [],
                    appState: createExcalidrawDefaultAppState(),
                    files: {},
                    slideQuestionDraft: undefined,
                    slideQuestionAsset: undefined,
                    createdAt: existingSlide?.createdAt ?? Date.now(),
                    updatedAt: Date.now(),
                  }
                : {
                    id: existingSlide?.id ?? nanoid(),
                    engine: "tldraw" as const,
                    sceneVersion: (existingSlide?.sceneVersion ?? 0) + 1,
                    snapshot: null,
                    slideQuestionDraft: undefined,
                    slideQuestionAsset: undefined,
                    createdAt: existingSlide?.createdAt ?? Date.now(),
                    updatedAt: Date.now(),
                  };

            const newSlides = p.slides.map((s, i) =>
              i === slideIndex ? clearedSlide : s
            );
            persistSlideToCache(clearedSlide, p.id, slideIndex);

            return {
              ...p,
              slides: newSlides,
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      saveProblemState: (presentationId: string, slideIndex: number) => {
        set((state) => ({
          presentations: state.presentations.map((p) => {
            if (p.id !== presentationId) return p;

            const newSlides = p.slides.map((s, i) => {
              if (i !== slideIndex) return s;

              let updated: SlideData;
              if (s.engine === "excalidraw") {
                updated = {
                  ...s,
                  problemBaselineElements: deepClone(s.elements),
                  problemBaselineAppState: deepClone(s.appState),
                  problemBaselineFiles: deepClone(s.files),
                  problemBaselineUpdatedAt: Date.now(),
                  updatedAt: Date.now(),
                };
              } else if (s.engine === "tldraw") {
                updated = {
                  ...s,
                  problemBaselineSnapshot: s.snapshot ? deepClone(s.snapshot) : null,
                  problemBaselineUpdatedAt: Date.now(),
                  updatedAt: Date.now(),
                };
              } else {
                return s;
              }
              persistSlideToCache(updated, p.id, i);
              return updated;
            });

            return {
              ...p,
              slides: newSlides,
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      resetToProblemState: (presentationId: string, slideIndex: number) => {
        set((state) => ({
          presentations: state.presentations.map((p) => {
            if (p.id !== presentationId) return p;

            const newSlides = p.slides.map((s, i) => {
              if (i !== slideIndex) return s;

              let updated: SlideData;
              if (s.engine === "excalidraw") {
                if (!s.problemBaselineElements) return s;
                updated = {
                  ...s,
                  sceneVersion: (s.sceneVersion ?? 0) + 1,
                  elements: deepClone(s.problemBaselineElements),
                  appState: deepClone(createExcalidrawDefaultAppState(s.problemBaselineAppState ?? {})),
                  files: deepClone(s.problemBaselineFiles ?? {}),
                  updatedAt: Date.now(),
                };
              } else if (s.engine === "tldraw") {
                if (s.problemBaselineSnapshot === undefined) return s;
                updated = {
                  ...s,
                  sceneVersion: (s.sceneVersion ?? 0) + 1,
                  snapshot: s.problemBaselineSnapshot ? deepClone(s.problemBaselineSnapshot) : null,
                  updatedAt: Date.now(),
                };
              } else {
                return s;
              }
              persistSlideToCache(updated, p.id, i);
              return updated;
            });

            return {
              ...p,
              slides: newSlides,
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      clearProblemState: (presentationId: string, slideIndex: number) => {
        set((state) => ({
          presentations: state.presentations.map((p) => {
            if (p.id !== presentationId) return p;

            const newSlides = p.slides.map((s, i) => {
              if (i !== slideIndex) return s;

              let updated: SlideData;
              if (s.engine === "excalidraw") {
                updated = {
                  ...s,
                  problemBaselineElements: undefined,
                  problemBaselineAppState: undefined,
                  problemBaselineFiles: undefined,
                  problemBaselineUpdatedAt: undefined,
                  updatedAt: Date.now(),
                };
              } else if (s.engine === "tldraw") {
                updated = {
                  ...s,
                  problemBaselineSnapshot: undefined,
                  problemBaselineUpdatedAt: undefined,
                  updatedAt: Date.now(),
                };
              } else {
                return s;
              }
              persistSlideToCache(updated, p.id, i);
              return updated;
            });

            return {
              ...p,
              slides: newSlides,
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      hydrateSlides: (presentationId: string, slides: SlideData[]) => {
        if (slides.length === 0) return;
        const slideMap = new Map(slides.map((s) => [s.id, s]));
        set((state) => ({
          presentations: state.presentations.map((p) => {
            if (p.id !== presentationId) return p;
            const hydrated = p.slides.map((s) => slideMap.get(s.id) ?? s);
            return { ...p, slides: hydrated };
          }),
        }));
      },

      setCurrentSlide: (presentationId: string, index: number) => {
        set((state) => ({
          presentations: state.presentations.map((p) =>
            p.id === presentationId
              ? {
                  ...p,
                  currentSlideIndex: Math.max(
                    0,
                    Math.min(index, p.slides.length - 1)
                  ),
                }
              : p
          ),
        }));
      },

      goToNextSlide: (presentationId: string) => {
        const presentation = get().presentations.find(
          (p) => p.id === presentationId
        );
        if (!presentation) return;

        const newIndex = Math.min(
          presentation.currentSlideIndex + 1,
          presentation.slides.length - 1
        );
        get().setCurrentSlide(presentationId, newIndex);
      },

      goToPreviousSlide: (presentationId: string) => {
        const presentation = get().presentations.find(
          (p) => p.id === presentationId
        );
        if (!presentation) return;

        const newIndex = Math.max(presentation.currentSlideIndex - 1, 0);
        get().setCurrentSlide(presentationId, newIndex);
      },

      exportPresentation: (id: string) => {
        const presentation = get().presentations.find((p) => p.id === id);
        if (!presentation) return "";
        return JSON.stringify(presentation, null, 2);
      },

      importPresentation: (data: string) => {
        try {
          const parsed = JSON.parse(data) as Presentation;

          if (!parsed.name || !Array.isArray(parsed.slides)) {
            console.error("Invalid presentation data");
            return null;
          }

          const inferredEngine: CanvasEngine =
            parsed.canvasEngine ??
            (parsed.slides.some((slide) => (slide as Partial<SlideData>).engine === "excalidraw" || "elements" in (slide as object))
              ? "excalidraw"
              : "tldraw");

          const newPresentation: Presentation = {
            ...parsed,
            id: nanoid(),
            name: `${parsed.name} (Imported)`,
            canvasEngine: inferredEngine,
            folderId: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            slides: parsed.slides.map((slide) => normalizeSlideData(slide, inferredEngine)),
            version: CURRENT_SCHEMA_VERSION,
          };

          set((state) => ({
            presentations: [...state.presentations, newPresentation],
          }));

          // Persist imported presentation to IndexedDB
          persistMetaToCache(newPresentation);
          newPresentation.slides.forEach((slide, i) =>
            persistSlideToCache(slide, newPresentation.id, i),
          );

          return newPresentation.id;
        } catch (error) {
          console.error("Failed to import presentation:", error);
          return null;
        }
      },

      addSlidesFromProblems: (presentationId: string, problems: ExtractedProblem[]) => {
        set((state) => ({
          presentations: state.presentations.map((p) => {
            if (p.id !== presentationId) return p;
            if (problems.length === 0) return p;

            const newSlides: SlideData[] = problems.map((problem) => {
              if (p.canvasEngine === "excalidraw") {
                return createExcalidrawSlideFromProblem(problem);
              }
              return createTldrawSlideFromProblem(problem);
            });

            const allSlides = [...p.slides, ...newSlides];
            const updated = {
              ...p,
              slides: allSlides,
              currentSlideIndex: p.slides.length,
              updatedAt: Date.now(),
            };

            // Persist new slides to IndexedDB
            newSlides.forEach((s, i) =>
              persistSlideToCache(s, p.id, p.slides.length + i),
            );
            persistMetaToCache(updated);
            return updated;
          }),
        }));
      },
    }),
    {
      name: "slideboard-storage",
      version: PERSIST_VERSION,
      storage: createJSONStorage(() => localStorage),
      /**
       * Normalize slide stubs on every rehydration so that slides deserialized
       * from localStorage always have the required canvas fields (elements:[],
       * snapshot:null, etc.) even when no version migration occurs.
       */
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const normalized = state.presentations.map((p) => ({
          ...p,
          slides: p.slides.map((s) => normalizeSlideData(s, p.canvasEngine)),
        }));
        usePresentationStore.setState({ presentations: normalized });
      },
      /**
       * Only persist the lightweight fields to localStorage.
       * Canvas data (slide snapshots, elements, files) is stored in IndexedDB
       * via the persistSlideToCache helpers above — keeping localStorage small.
       */
      partialize: (state) => ({
        folders: state.folders,
        currentPresentationId: state.currentPresentationId,
        presentations: state.presentations.map((p) => ({
          id: p.id,
          name: p.name,
          canvasEngine: p.canvasEngine,
          folderId: p.folderId,
          currentSlideIndex: p.currentSlideIndex,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          version: p.version,
          // Store only slide stubs (id + engine + timestamps) — no canvas data
          slides: p.slides.map((s) => ({
            id: s.id,
            engine: s.engine,
            sceneVersion: s.sceneVersion,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            ...(s.engine === "embed"
                ? {
                    provider: s.provider,
                    url: s.url,
                    embedUrl: s.embedUrl,
                    title: s.title,
                    renderMode: s.renderMode,
                  }
                : {}),
            ...(s.slideQuestionDraft
              ? { slideQuestionDraft: s.slideQuestionDraft }
              : {}),
            ...(s.slideQuestionAsset
              ? { slideQuestionAsset: s.slideQuestionAsset }
              : {}),
          })),
        })),
      }),
      migrate: (persistedState) => {
        const state = persistedState as Partial<PresentationStore> | undefined;
        if (!state) {
          return createResetState() as unknown as PresentationStore;
        }

        const migratedPresentations = (state.presentations ?? []).map((presentation) => {
          const inferredEngine: CanvasEngine =
            "canvasEngine" in presentation && presentation.canvasEngine === "excalidraw"
              ? "excalidraw"
              : Array.isArray(presentation.slides) && presentation.slides.some((slide) => "elements" in slide)
                ? "excalidraw"
                : "tldraw";

          const migratedSlides = Array.isArray(presentation.slides)
            ? presentation.slides.map((slide) => normalizeSlideData(slide, inferredEngine))
            : [createEmptySlide(inferredEngine)];

          return {
            ...presentation,
            canvasEngine: inferredEngine,
            folderId: "folderId" in presentation ? presentation.folderId : null,
            slides: migratedSlides,
            version: CURRENT_SCHEMA_VERSION,
          };
        });

        return {
          ...state,
          folders: state.folders ?? [],
          presentations: migratedPresentations,
          currentPresentationId: state.currentPresentationId ?? null,
        } as PresentationStore;
      },
    }
  )
);
