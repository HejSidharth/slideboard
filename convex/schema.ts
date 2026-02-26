import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // -------------------------------------------------------------------------
  // Slide canvas data storage tables
  // -------------------------------------------------------------------------

  /**
   * One row per presentation. Stores metadata only — canvas data lives in
   * the `slides` table. The ownerTokenHash is a SHA-256 hex of the raw owner
   * token stored in the browser's localStorage. It is never returned to the
   * client.
   */
  storedPresentations: defineTable({
    presentationId: v.string(),
    name: v.string(),
    canvasEngine: v.union(v.literal("tldraw"), v.literal("excalidraw")),
    folderId: v.optional(v.string()),
    currentSlideIndex: v.number(),
    version: v.number(),
    ownerTokenHash: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_presentation_id", ["presentationId"]),

  /**
   * One row per slide. Canvas data (JSON-serialised snapshot/elements) is
   * stored here with images stripped out (they live in `slideAssets`).
   */
  slides: defineTable({
    presentationId: v.string(),
    slideId: v.string(),
    slideIndex: v.number(),
    engine: v.union(v.literal("tldraw"), v.literal("excalidraw")),
    sceneVersion: v.number(),
    // tldraw: JSON.stringify(snapshot) with asset srcs replaced by convexUrl refs
    snapshotJson: v.optional(v.string()),
    // excalidraw: JSON.stringify(elements) with file dataURLs replaced by convexUrl refs
    elementsJson: v.optional(v.string()),
    // excalidraw: JSON.stringify(trimmed appState)
    appStateJson: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_presentation", ["presentationId", "slideIndex"])
    .index("by_slide_id", ["slideId"]),

  /**
   * One row per image/asset extracted from a slide.
   * Maps (slideId, assetKey) → Convex File Storage ID.
   * contentHash enables deduplication within a presentation.
   */
  slideAssets: defineTable({
    presentationId: v.string(),
    slideId: v.string(),
    assetKey: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    sizeBytes: v.number(),
    contentHash: v.string(),
    createdAt: v.number(),
  })
    .index("by_slide", ["slideId"])
    .index("by_presentation", ["presentationId"])
    .index("by_hash", ["presentationId", "contentHash"]),


  messages: defineTable({
    presentationId: v.string(),
    participantId: v.string(),
    displayName: v.string(),
    color: v.string(),
    content: v.string(),
    clientMessageId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_presentation", ["presentationId", "createdAt"])
    .index("by_client_message", ["presentationId", "clientMessageId"]),

  polls: defineTable({
    presentationId: v.string(),
    question: v.string(),
    options: v.array(v.string()),
    pollType: v.optional(v.union(v.literal("multiple_choice"), v.literal("confidence"))),
    createdBy: v.string(),
    isActive: v.boolean(),
    resultsVisible: v.optional(v.boolean()),
    clientRequestId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_presentation", ["presentationId", "createdAt"])
    .index("by_client_request", ["presentationId", "clientRequestId"]),

  votes: defineTable({
    pollId: v.id("polls"),
    participantId: v.string(),
    optionIndex: v.number(),
    createdAt: v.number(),
  })
    .index("by_poll", ["pollId"])
    .index("by_poll_participant", ["pollId", "participantId"]),

  likes: defineTable({
    messageId: v.id("messages"),
    participantId: v.string(),
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_message_participant", ["messageId", "participantId"]),

  pollLikes: defineTable({
    pollId: v.id("polls"),
    participantId: v.string(),
    createdAt: v.number(),
  })
    .index("by_poll", ["pollId"])
    .index("by_poll_participant", ["pollId", "participantId"]),

  questions: defineTable({
    presentationId: v.string(),
    text: v.string(),
    askedBy: v.string(),
    upvotes: v.number(),
    isAnswered: v.boolean(),
    isHidden: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_presentation", ["presentationId", "createdAt"]),

  questionVotes: defineTable({
    questionId: v.id("questions"),
    voterId: v.string(),
    createdAt: v.number(),
  })
    .index("by_question", ["questionId"])
    .index("by_question_voter", ["questionId", "voterId"]),

  hostSessions: defineTable({
    presentationId: v.string(),
    token: v.string(),
    createdAt: v.number(),
  })
    .index("by_presentation", ["presentationId"])
    .index("by_token", ["presentationId", "token"]),

  /**
   * One row per presentation — the currently-broadcasting live canvas state.
   * Updated by the presenter on a ~2 s throttle; subscribed to by viewers
   * via a reactive query. Shape graph only; binary assets are NOT included.
   */
  liveSlideState: defineTable({
    presentationId: v.string(),
    slideId: v.string(),
    slideIndex: v.number(),
    engine: v.union(v.literal("tldraw"), v.literal("excalidraw")),
    snapshotJson: v.string(),
    updatedAt: v.number(),
  }).index("by_presentation_id", ["presentationId"]),

  // -------------------------------------------------------------------------
  // Host-authored structured questions (MCQ + free response, optional timer)
  // -------------------------------------------------------------------------

  /**
   * One row per host-authored question. The host creates these from the editor
   * and students answer them from the join page.
   */
  hostedQuestions: defineTable({
    presentationId: v.string(),
    /** SHA-256 hex of raw host token — stored for auth, never returned */
    hostToken: v.string(),
    questionType: v.union(v.literal("mcq"), v.literal("free_response")),
    prompt: v.string(),
    /** MCQ only — list of answer choices */
    options: v.optional(v.array(v.string())),
    /** MCQ only — 0-based index of the correct option */
    correctIndex: v.optional(v.number()),
    isActive: v.boolean(),
    resultsVisible: v.boolean(),
    /** Duration in ms; null/absent = untimed */
    timeLimitMs: v.optional(v.number()),
    /** Epoch ms when the host activated the question (started the timer) */
    startedAt: v.optional(v.number()),
    /** Epoch ms when the question was closed (manually or by auto-close) */
    closedAt: v.optional(v.number()),
    clientRequestId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_presentation", ["presentationId", "createdAt"])
    .index("by_client_request", ["presentationId", "clientRequestId"]),

  /**
   * One row per student answer. Upserted — one answer per participant per
   * question. MCQ stores optionIndex; free response stores freeText.
   */
  hostedAnswers: defineTable({
    questionId: v.id("hostedQuestions"),
    participantId: v.string(),
    /** MCQ: selected option index */
    mcqIndex: v.optional(v.number()),
    /** Free response: student's text answer */
    freeText: v.optional(v.string()),
    submittedAt: v.number(),
  })
    .index("by_question", ["questionId"])
    .index("by_question_participant", ["questionId", "participantId"]),
});
