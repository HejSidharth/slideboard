// Re-export types from @excalidraw/excalidraw using correct import paths
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExcalidrawElement = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any  
export type BinaryFiles = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppState = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExcalidrawImperativeAPI = any;

export interface SlideData {
  id: string;
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
  createdAt: number;
  updatedAt: number;
}

export interface Presentation {
  id: string;
  name: string;
  slides: SlideData[];
  currentSlideIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface PresentationStore {
  presentations: Presentation[];
  currentPresentationId: string | null;
  
  // Presentation CRUD
  createPresentation: (name: string) => string;
  deletePresentation: (id: string) => void;
  renamePresentation: (id: string, name: string) => void;
  duplicatePresentation: (id: string) => string;
  setCurrentPresentation: (id: string | null) => void;
  getCurrentPresentation: () => Presentation | null;
  
  // Slide operations
  addSlide: (presentationId: string) => void;
  deleteSlide: (presentationId: string, slideIndex: number) => void;
  duplicateSlide: (presentationId: string, slideIndex: number) => void;
  reorderSlides: (presentationId: string, fromIndex: number, toIndex: number) => void;
  updateSlide: (presentationId: string, slideIndex: number, data: Partial<SlideData>) => void;
  clearSlide: (presentationId: string, slideIndex: number) => void;
  
  // Navigation
  setCurrentSlide: (presentationId: string, index: number) => void;
  goToNextSlide: (presentationId: string) => void;
  goToPreviousSlide: (presentationId: string) => void;
  
  // Export/Import
  exportPresentation: (id: string) => string;
  importPresentation: (data: string) => string | null;
}
