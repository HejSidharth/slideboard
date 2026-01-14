"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Presentation, PresentationStore, SlideData } from "@/types";

const createEmptySlide = (): SlideData => ({
  id: nanoid(),
  elements: [],
  appState: {
    viewBackgroundColor: "#ffffff",
  },
  files: {},
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const createDefaultPresentation = (name: string): Presentation => ({
  id: nanoid(),
  name,
  slides: [createEmptySlide()],
  currentSlideIndex: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const usePresentationStore = create<PresentationStore>()(
  persist(
    (set, get) => ({
      presentations: [],
      currentPresentationId: null,

      // Presentation CRUD
      createPresentation: (name: string) => {
        const presentation = createDefaultPresentation(name);
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

      duplicatePresentation: (id: string) => {
        const presentation = get().presentations.find((p) => p.id === id);
        if (!presentation) return "";
        
        const newPresentation: Presentation = {
          ...JSON.parse(JSON.stringify(presentation)),
          id: nanoid(),
          name: `${presentation.name} (Copy)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          slides: presentation.slides.map((s) => ({
            ...JSON.parse(JSON.stringify(s)),
            id: nanoid(),
          })),
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

      // Slide operations
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
            if (p.slides.length <= 1) return p; // Keep at least one slide
            
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

      reorderSlides: (presentationId: string, fromIndex: number, toIndex: number) => {
        set((state) => ({
          presentations: state.presentations.map((p) => {
            if (p.id !== presentationId) return p;
            
            const newSlides = [...p.slides];
            const [movedSlide] = newSlides.splice(fromIndex, 1);
            newSlides.splice(toIndex, 0, movedSlide);
            
            // Update current slide index if it was affected
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
                    ...s,
                    elements: [],
                    files: {},
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

      // Navigation
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

      // Export/Import
      exportPresentation: (id: string) => {
        const presentation = get().presentations.find((p) => p.id === id);
        if (!presentation) return "";
        return JSON.stringify(presentation, null, 2);
      },

      importPresentation: (data: string) => {
        try {
          const parsed = JSON.parse(data) as Presentation;
          
          // Validate basic structure
          if (!parsed.name || !Array.isArray(parsed.slides)) {
            console.error("Invalid presentation data");
            return null;
          }
          
          // Create new IDs to avoid conflicts
          const newPresentation: Presentation = {
            ...parsed,
            id: nanoid(),
            name: `${parsed.name} (Imported)`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            slides: parsed.slides.map((s) => ({
              ...s,
              id: nanoid(),
            })),
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
      version: 1,
    }
  )
);
