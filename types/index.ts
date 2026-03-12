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
export type SlideEngine = CanvasEngine | "embed";
export type EmbedProvider = "generic" | "kahoot" | "gimkit" | "quizizz" | "youtube";
export type EmbedRenderMode = "embed" | "launch-only";

export type ExcalidrawElement = Record<string, unknown>;
export type BinaryFiles = Record<string, unknown>;
export type AppState = Record<string, unknown>;

export interface SlideMcqDraft {
  prompt: string;
  options: string[];
  correctIndex: number | null;
}

export interface SlideMcqCanvasAsset {
  engine: CanvasEngine;
  shapeId?: string;
  assetId?: string;
  elementId?: string;
  fileId?: string;
}

interface BaseSlideData {
  id: string;
  engine: SlideEngine;
  sceneVersion: number;
  createdAt: number;
  updatedAt: number;
  slideQuestionDraft?: SlideMcqDraft;
  slideQuestionAsset?: SlideMcqCanvasAsset;
}

export interface TldrawSlideData extends BaseSlideData {
  engine: "tldraw";
  snapshot: StoreSnapshot<TLRecord> | null;
  problemBaselineSnapshot?: StoreSnapshot<TLRecord> | null;
  problemBaselineUpdatedAt?: number;
}

export interface ExcalidrawSlideData extends BaseSlideData {
  engine: "excalidraw";
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
  problemBaselineElements?: readonly ExcalidrawElement[];
  problemBaselineAppState?: Partial<AppState>;
  problemBaselineFiles?: BinaryFiles;
  problemBaselineUpdatedAt?: number;
}

export interface EmbedSlideData extends BaseSlideData {
  engine: "embed";
  provider: EmbedProvider;
  url: string;
  embedUrl: string | null;
  title: string;
  renderMode: EmbedRenderMode;
}

export type SlideData = TldrawSlideData | ExcalidrawSlideData | EmbedSlideData;

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
  addEmbedSlide: (
    presentationId: string,
    input: {
      provider: EmbedProvider;
      url: string;
      embedUrl: string | null;
      title: string;
      renderMode: EmbedRenderMode;
    },
  ) => void;
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
  saveProblemState: (presentationId: string, slideIndex: number) => void;
  resetToProblemState: (presentationId: string, slideIndex: number) => void;
  clearProblemState: (presentationId: string, slideIndex: number) => void;

  setCurrentSlide: (presentationId: string, index: number) => void;
  goToNextSlide: (presentationId: string) => void;
  goToPreviousSlide: (presentationId: string) => void;

  exportPresentation: (id: string) => string;
  importPresentation: (data: string) => string | null;

  addSlidesFromProblems: (
    presentationId: string,
    problems: ExtractedProblem[],
  ) => void;

  /**
   * Replace the canvas data of existing slides with full SlideData loaded
   * from IndexedDB (or Convex). Matched by slide id; unmatched slides are
   * left untouched.
   */
  hydrateSlides: (presentationId: string, slides: SlideData[]) => void;
}

export interface ProblemBoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface ExtractedProblem {
  problemNumber: string;
  boundingBox: ProblemBoundingBox;
  description: string;
  croppedImageDataURL: string;
  sourcePageIndex: number;
  width: number;
  height: number;
}

export const CURRENT_SCHEMA_VERSION = 6;

// ---------------------------------------------------------------------------
// Hosted questions (host-authored MCQ + free response)
// ---------------------------------------------------------------------------

export type HostedQuestionType = "mcq" | "free_response";

export interface HostedAnswerData {
  participantId: string;
  mcqIndex: number | null;
  freeText: string | null;
  submittedAt: number;
}

export interface HostedQuestionData {
  _id: string;
  questionType: HostedQuestionType;
  prompt: string;
  /** MCQ only */
  options: string[] | null;
  /** Null until resultsVisible (or always present for host) */
  correctIndex: number | null;
  isActive: boolean;
  resultsVisible: boolean;
  timeLimitMs: number | null;
  startedAt: number | null;
  closedAt: number | null;
  createdAt: number;
  answerCount: number;
  myAnswer: { mcqIndex: number | null; freeText: string | null } | null;
  /** Present only in host view */
  answers: HostedAnswerData[] | null;
}

// ---------------------------------------------------------------------------
// Unified activities (merges polls + hostedQuestions into one feed)
// ---------------------------------------------------------------------------

/** Fields shared across all four activity variants. */
interface UnifiedActivityBase {
  _id: string;
  createdAt: number;
  isActive: boolean;
  resultsVisible: boolean;
  /** The question / prompt text. */
  prompt: string;
  answerCount: number;
}

/** Poll — Multiple Choice */
export interface UnifiedPollMcq extends UnifiedActivityBase {
  source: "poll";
  kind: "poll_mcq";
  /** MCQ option labels */
  options: string[];
  /** Vote counts per option — null when resultsVisible is false */
  voteCounts: number[] | null;
  totalVotes: number;
  /** This participant's chosen option index, or -1 if not voted */
  myVote: number;
}

/** Poll — Confidence (5-star) */
export interface UnifiedPollConfidence extends UnifiedActivityBase {
  source: "poll";
  kind: "poll_confidence";
  /** 5 slots (stars 1–5). Null when resultsVisible is false */
  voteCounts: number[] | null;
  totalVotes: number;
  /** Star index (0–4) chosen by this participant, or -1 if not voted */
  myVote: number;
}

/** Question — Multiple Choice */
export interface UnifiedQuestionMcq extends UnifiedActivityBase {
  source: "question";
  kind: "question_mcq";
  options: string[];
  /** Null until resultsVisible (or always for host) */
  correctIndex: number | null;
  timeLimitMs: number | null;
  startedAt: number | null;
  closedAt: number | null;
  myAnswer: { mcqIndex: number | null; freeText: string | null } | null;
  /** Host only — null for students */
  answers: HostedAnswerData[] | null;
}

/** Question — Free Response */
export interface UnifiedQuestionFrq extends UnifiedActivityBase {
  source: "question";
  kind: "question_frq";
  timeLimitMs: number | null;
  startedAt: number | null;
  closedAt: number | null;
  myAnswer: { mcqIndex: number | null; freeText: string | null } | null;
  /** Host only — null for students */
  answers: HostedAnswerData[] | null;
}

export type UnifiedActivity =
  | UnifiedPollMcq
  | UnifiedPollConfidence
  | UnifiedQuestionMcq
  | UnifiedQuestionFrq;
