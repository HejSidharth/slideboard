"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type {
  AppState,
  BinaryFiles,
  CanvasEngine,
  ExcalidrawElement,
  Folder,
  Presentation,
  PresentationStore,
  SlideData,
  TldrawSlideData,
  ExcalidrawSlideData,
} from "@/types";
import { CURRENT_SCHEMA_VERSION } from "@/types";
import type { StoreSnapshot, TLRecord } from "tldraw";

const PERSIST_VERSION = 7;

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const createEmptySlide = (engine: CanvasEngine): SlideData => {
  if (engine === "excalidraw") {
    return {
      id: nanoid(),
      engine,
      sceneVersion: 0,
      elements: [],
      appState: {},
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

function normalizeSlideData(rawSlide: unknown, fallbackEngine: CanvasEngine): SlideData {
  const timestamp = Date.now();
  const slide = rawSlide as Partial<SlideData> | undefined;

  const hasExcalidrawData = !!slide && (slide.engine === "excalidraw" || "elements" in slide);
  const engine: CanvasEngine = hasExcalidrawData ? "excalidraw" : fallbackEngine;

  if (engine === "excalidraw") {
    return {
      id: nanoid(),
      engine,
      sceneVersion:
        typeof (slide as { sceneVersion?: unknown })?.sceneVersion === "number"
          ? ((slide as { sceneVersion: number }).sceneVersion)
          : 0,
      elements: isExcalidrawElements((slide as { elements?: unknown })?.elements)
        ? ((slide as { elements: readonly ExcalidrawElement[] }).elements)
        : [],
      appState:
        slide && typeof (slide as { appState?: unknown }).appState === "object" && (slide as { appState?: unknown }).appState
          ? ((slide as { appState: Partial<AppState> }).appState)
          : {},
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
      currentPresentationId: null,

      createPresentation: (name: string, folderId: string | null = null, canvasEngine: CanvasEngine = "tldraw") => {
        const presentation = createDefaultPresentation(name, folderId, canvasEngine);
        set((state) => ({
          presentations: [...state.presentations, presentation],
          currentPresentationId: presentation.id,
        }));
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
      },

      renamePresentation: (id: string, name: string) => {
        set((state) => ({
          presentations: state.presentations.map((p) =>
            p.id === id ? { ...p, name, updatedAt: Date.now() } : p
          ),
        }));
      },

      movePresentationToFolder: (id: string, folderId: string | null) => {
        set((state) => ({
          presentations: state.presentations.map((p) =>
            p.id === id ? { ...p, folderId, updatedAt: Date.now() } : p
          ),
        }));
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
            return {
              ...p,
              slides: newSlides,
              currentSlideIndex: p.currentSlideIndex + 1,
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      deleteSlide: (presentationId: string, slideIndex: number) => {
        set((state) => ({
          presentations: state.presentations.map((p) => {
            if (p.id !== presentationId) return p;
            if (p.slides.length <= 1) return p;

            const newSlides = p.slides.filter((_, i) => i !== slideIndex);
            const newCurrentIndex = Math.min(
              p.currentSlideIndex,
              newSlides.length - 1
            );

            return {
              ...p,
              slides: newSlides,
              currentSlideIndex: newCurrentIndex >= 0 ? newCurrentIndex : 0,
              updatedAt: Date.now(),
            };
          }),
        }));
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

            return {
              ...p,
              slides: newSlides,
              currentSlideIndex: slideIndex + 1,
              updatedAt: Date.now(),
            };
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

            return {
              ...p,
              slides: newSlides,
              currentSlideIndex: newCurrentIndex,
              updatedAt: Date.now(),
            };
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

            const newSlides = p.slides.map((s, i) =>
              i === slideIndex
                ? s.engine === "tldraw"
                  ? {
                      ...s,
                      snapshot: "snapshot" in data ? (data as Partial<TldrawSlideData>).snapshot ?? null : s.snapshot,
                      updatedAt: Date.now(),
                    }
                  : {
                      ...s,
                      elements: "elements" in data ? (data as Partial<ExcalidrawSlideData>).elements ?? [] : s.elements,
                      appState: "appState" in data ? (data as Partial<ExcalidrawSlideData>).appState ?? {} : s.appState,
                      files: "files" in data ? (data as Partial<ExcalidrawSlideData>).files ?? {} : s.files,
                      updatedAt: Date.now(),
                    }
                : s,
            );

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

            const newSlides = p.slides.map((s, i) =>
              i === slideIndex
                ? p.canvasEngine === "excalidraw"
                  ? {
                      id: s.id,
                      engine: "excalidraw" as const,
                      sceneVersion: (s.sceneVersion ?? 0) + 1,
                      elements: [],
                      appState: {},
                      files: {},
                      createdAt: s.createdAt,
                      updatedAt: Date.now(),
                    }
                  : {
                      id: s.id,
                      engine: "tldraw" as const,
                      sceneVersion: (s.sceneVersion ?? 0) + 1,
                      snapshot: null,
                      createdAt: s.createdAt,
                      updatedAt: Date.now(),
                    }
                : s
            );

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

              if (s.engine === "excalidraw") {
                return {
                  ...s,
                  problemBaselineElements: deepClone(s.elements),
                  problemBaselineAppState: deepClone(s.appState),
                  problemBaselineFiles: deepClone(s.files),
                  problemBaselineUpdatedAt: Date.now(),
                  updatedAt: Date.now(),
                };
              }

              return {
                ...s,
                problemBaselineSnapshot: s.snapshot ? deepClone(s.snapshot) : null,
                problemBaselineUpdatedAt: Date.now(),
                updatedAt: Date.now(),
              };
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

              if (s.engine === "excalidraw") {
                if (!s.problemBaselineElements) return s;
                return {
                  ...s,
                  sceneVersion: (s.sceneVersion ?? 0) + 1,
                  elements: deepClone(s.problemBaselineElements),
                  appState: deepClone(s.problemBaselineAppState ?? {}),
                  files: deepClone(s.problemBaselineFiles ?? {}),
                  updatedAt: Date.now(),
                };
              }

              if (s.problemBaselineSnapshot === undefined) return s;
              return {
                ...s,
                sceneVersion: (s.sceneVersion ?? 0) + 1,
                snapshot: s.problemBaselineSnapshot ? deepClone(s.problemBaselineSnapshot) : null,
                updatedAt: Date.now(),
              };
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

              if (s.engine === "excalidraw") {
                return {
                  ...s,
                  problemBaselineElements: undefined,
                  problemBaselineAppState: undefined,
                  problemBaselineFiles: undefined,
                  problemBaselineUpdatedAt: undefined,
                  updatedAt: Date.now(),
                };
              }

              return {
                ...s,
                problemBaselineSnapshot: undefined,
                problemBaselineUpdatedAt: undefined,
                updatedAt: Date.now(),
              };
            });

            return {
              ...p,
              slides: newSlides,
              updatedAt: Date.now(),
            };
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

          return newPresentation.id;
        } catch (error) {
          console.error("Failed to import presentation:", error);
          return null;
        }
      },
    }),
    {
      name: "slideboard-storage",
      version: PERSIST_VERSION,
      storage: createJSONStorage(() => localStorage),
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
