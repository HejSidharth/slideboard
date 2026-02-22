import type {
  TLRecord,
  TLShape,
  TLShapeId,
  TLStore,
  Editor,
  StoreSnapshot,
} from "tldraw";

export type { TLRecord, TLShape, TLShapeId, TLStore, Editor, StoreSnapshot };

export type CanvasEngine = "tldraw" | "excalidraw";

export type ExcalidrawElement = Record<string, unknown>;
export type BinaryFiles = Record<string, unknown>;
export type AppState = Record<string, unknown>;

interface BaseSlideData {
  id: string;
  engine: CanvasEngine;
  createdAt: number;
  updatedAt: number;
}

export interface TldrawSlideData extends BaseSlideData {
  engine: "tldraw";
  snapshot: StoreSnapshot<TLRecord> | null;
}

export interface ExcalidrawSlideData extends BaseSlideData {
  engine: "excalidraw";
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
}

export type SlideData = TldrawSlideData | ExcalidrawSlideData;

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Presentation {
  id: string;
  name: string;
  canvasEngine: CanvasEngine;
  folderId: string | null;
  slides: SlideData[];
  currentSlideIndex: number;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface PresentationStore {
  folders: Folder[];
  presentations: Presentation[];
  currentPresentationId: string | null;

  createPresentation: (name: string, folderId?: string | null, canvasEngine?: CanvasEngine) => string;
  deletePresentation: (id: string) => void;
  renamePresentation: (id: string, name: string) => void;
  movePresentationToFolder: (id: string, folderId: string | null) => void;
  duplicatePresentation: (id: string) => string;
  setCurrentPresentation: (id: string | null) => void;
  getCurrentPresentation: () => Presentation | null;

  createFolder: (name: string, parentId?: string | null) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;

  addSlide: (presentationId: string) => void;
  deleteSlide: (presentationId: string, slideIndex: number) => void;
  duplicateSlide: (presentationId: string, slideIndex: number) => void;
  reorderSlides: (
    presentationId: string,
    fromIndex: number,
    toIndex: number
  ) => void;
  updateSlide: (
    presentationId: string,
    slideIndex: number,
    data: Partial<SlideData>
  ) => void;
  clearSlide: (presentationId: string, slideIndex: number) => void;

  setCurrentSlide: (presentationId: string, index: number) => void;
  goToNextSlide: (presentationId: string) => void;
  goToPreviousSlide: (presentationId: string) => void;

  exportPresentation: (id: string) => string;
  importPresentation: (data: string) => string | null;
}

export const CURRENT_SCHEMA_VERSION = 4;
