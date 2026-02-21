"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Folder, Presentation, PresentationStore, SlideData } from "@/types";
import { CURRENT_SCHEMA_VERSION } from "@/types";
import type { StoreSnapshot, TLRecord } from "tldraw";

const PERSIST_VERSION = 4;

const createEmptySlide = (): SlideData => ({
  id: nanoid(),
  snapshot: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const createResetState = (): Pick<PresentationStore, "folders" | "presentations" | "currentPresentationId"> => ({
  folders: [],
  presentations: [],
  currentPresentationId: null,
});

function isStoreSnapshot(value: unknown): value is StoreSnapshot<TLRecord> {
  if (!value || typeof value !== "object") return false;
  return "schema" in value && "store" in value;
}

const sanitizeImportedSlide = (slide: SlideData): SlideData => ({
  ...slide,
  id: nanoid(),
  snapshot: isStoreSnapshot(slide.snapshot) ? slide.snapshot : null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const createDefaultPresentation = (name: string, folderId: string | null = null): Presentation => ({
  id: nanoid(),
  name,
  folderId,
  slides: [createEmptySlide()],
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

      createPresentation: (name: string, folderId: string | null = null) => {
        const presentation = createDefaultPresentation(name, folderId);
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
            const newSlide = createEmptySlide();
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
                ? { ...s, ...data, updatedAt: Date.now() }
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

      clearSlide: (presentationId: string, slideIndex: number) => {
        set((state) => ({
          presentations: state.presentations.map((p) => {
            if (p.id !== presentationId) return p;

            const newSlides = p.slides.map((s, i) =>
              i === slideIndex
                ? {
                    ...createEmptySlide(),
                    id: s.id,
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

          const newPresentation: Presentation = {
            ...parsed,
            id: nanoid(),
            name: `${parsed.name} (Imported)`,
            folderId: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            slides: parsed.slides.map(sanitizeImportedSlide),
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

        const migratedPresentations = (state.presentations ?? []).map((presentation) => ({
          ...presentation,
          folderId: "folderId" in presentation ? presentation.folderId : null,
        }));

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
