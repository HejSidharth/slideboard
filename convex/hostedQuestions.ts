import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ---------------------------------------------------------------------------
// Auth helper — reuses the same hostSessions table as convex/questions.ts
// ---------------------------------------------------------------------------

async function assertHost(
  ctx: { db: any },
  presentationId: string,
  hostToken: string,
): Promise<boolean> {
  if (!hostToken) return false;
  const session = await ctx.db
    .query("hostSessions")
    .withIndex("by_token", (q: any) =>
      q.eq("presentationId", presentationId).eq("token", hostToken),
    )
    .first();
  return session !== null;
}

// ---------------------------------------------------------------------------
// Close all active hosted questions (single-active enforcement)
// ---------------------------------------------------------------------------

async function closeActiveQuestions(
  ctx: { db: any },
  presentationId: string,
  excludeId?: string,
) {
  const all = await ctx.db
    .query("hostedQuestions")
    .withIndex("by_presentation", (q: any) =>
      q.eq("presentationId", presentationId),
    )
    .collect();

  const now = Date.now();
  for (const hq of all) {
    if (hq.isActive && hq._id !== excludeId) {
      await ctx.db.patch(hq._id, { isActive: false, closedAt: now });
    }
  }
}

// ---------------------------------------------------------------------------
// list — query
// ---------------------------------------------------------------------------

export const list = query({
  args: {
    presentationId: v.string(),
    participantId: v.string(),
    /** If provided and valid, full answer data is returned (host view). */
    hostToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const isHost = args.hostToken
      ? await assertHost(ctx, args.presentationId, args.hostToken)
      : false;

    const questions = await ctx.db
      .query("hostedQuestions")
      .withIndex("by_presentation", (q: any) =>
        q.eq("presentationId", args.presentationId),
      )
      .order("desc")
      .take(50);

    const enriched = await Promise.all(
      questions.map(async (hq: any) => {
        const answers = await ctx.db
          .query("hostedAnswers")
          .withIndex("by_question", (q: any) => q.eq("questionId", hq._id))
          .collect();

        const answerCount = answers.length;

        // My answer for this participant
        const myAnswerRow = answers.find(
          (a: any) => a.participantId === args.participantId,
        );
        const myAnswer = myAnswerRow
          ? {
              mcqIndex: myAnswerRow.mcqIndex ?? null,
              freeText: myAnswerRow.freeText ?? null,
            }
          : null;

        // Host gets full answer list + correct answer; students only get
        // correctIndex after resultsVisible is true
        const base = {
          _id: hq._id,
          questionType: hq.questionType,
          prompt: hq.prompt,
          options: hq.options ?? null,
          isActive: hq.isActive,
          resultsVisible: hq.resultsVisible,
          timeLimitMs: hq.timeLimitMs ?? null,
          startedAt: hq.startedAt ?? null,
          closedAt: hq.closedAt ?? null,
          createdAt: hq.createdAt,
          answerCount,
          myAnswer,
          // Correct answer revealed to everyone once resultsVisible, or always to host
          correctIndex:
            isHost || hq.resultsVisible ? (hq.correctIndex ?? null) : null,
        };

        if (isHost) {
          // Host sees all responses
          const answerList = answers.map((a: any) => ({
            participantId: a.participantId,
            mcqIndex: a.mcqIndex ?? null,
            freeText: a.freeText ?? null,
            submittedAt: a.submittedAt,
          }));
          return { ...base, answers: answerList };
        }

        return { ...base, answers: null };
      }),
    );

    return enriched;
  },
});

// ---------------------------------------------------------------------------
// create — mutation (host only)
// ---------------------------------------------------------------------------

export const create = mutation({
  args: {
    presentationId: v.string(),
    hostToken: v.string(),
    questionType: v.union(v.literal("mcq"), v.literal("free_response")),
    prompt: v.string(),
    options: v.optional(v.array(v.string())),
    correctIndex: v.optional(v.number()),
    timeLimitMs: v.optional(v.number()),
    clientRequestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const isHost = await assertHost(ctx, args.presentationId, args.hostToken);
    if (!isHost) return null;

    const prompt = args.prompt.trim();
    if (!prompt) return null;

    // Validate MCQ
    if (args.questionType === "mcq") {
      const opts = (args.options ?? []).filter((o) => o.trim());
      if (opts.length < 2) return null;
    }

    // Dedup by clientRequestId
    if (args.clientRequestId) {
      const existing = await ctx.db
        .query("hostedQuestions")
        .withIndex("by_client_request", (q: any) =>
          q
            .eq("presentationId", args.presentationId)
            .eq("clientRequestId", args.clientRequestId),
        )
        .first();
      if (existing) return existing._id;
    }

    // Close any currently active question
    await closeActiveQuestions(ctx, args.presentationId);

    const id = await ctx.db.insert("hostedQuestions", {
      presentationId: args.presentationId,
      hostToken: args.hostToken,
      questionType: args.questionType,
      prompt,
      options:
        args.questionType === "mcq"
          ? (args.options ?? []).map((o) => o.trim()).filter(Boolean)
          : undefined,
      correctIndex:
        args.questionType === "mcq" ? (args.correctIndex ?? undefined) : undefined,
      isActive: true,
      resultsVisible: false,
      timeLimitMs: args.timeLimitMs ?? undefined,
      startedAt: Date.now(),
      clientRequestId: args.clientRequestId,
      createdAt: Date.now(),
    });

    return id;
  },
});

// ---------------------------------------------------------------------------
// activate — mutation (host only): re-open a closed question + start timer
// ---------------------------------------------------------------------------

export const activate = mutation({
  args: {
    questionId: v.id("hostedQuestions"),
    hostToken: v.string(),
  },
  handler: async (ctx, args) => {
    const hq = await ctx.db.get(args.questionId);
    if (!hq) return null;

    const isHost = await assertHost(ctx, hq.presentationId, args.hostToken);
    if (!isHost) return null;

    await closeActiveQuestions(ctx, hq.presentationId, args.questionId);

    await ctx.db.patch(args.questionId, {
      isActive: true,
      startedAt: Date.now(),
      closedAt: undefined,
    });
    return args.questionId;
  },
});

// ---------------------------------------------------------------------------
// close — mutation (host only)
// ---------------------------------------------------------------------------

export const close = mutation({
  args: {
    questionId: v.id("hostedQuestions"),
    hostToken: v.string(),
  },
  handler: async (ctx, args) => {
    const hq = await ctx.db.get(args.questionId);
    if (!hq) return null;

    const isHost = await assertHost(ctx, hq.presentationId, args.hostToken);
    if (!isHost) return null;

    await ctx.db.patch(args.questionId, {
      isActive: false,
      closedAt: Date.now(),
    });
    return args.questionId;
  },
});

// ---------------------------------------------------------------------------
// setResultsVisible — mutation (host only)
// ---------------------------------------------------------------------------

export const setResultsVisible = mutation({
  args: {
    questionId: v.id("hostedQuestions"),
    hostToken: v.string(),
    visible: v.boolean(),
  },
  handler: async (ctx, args) => {
    const hq = await ctx.db.get(args.questionId);
    if (!hq) return null;

    const isHost = await assertHost(ctx, hq.presentationId, args.hostToken);
    if (!isHost) return null;

    await ctx.db.patch(args.questionId, { resultsVisible: args.visible });
    return args.questionId;
  },
});

// ---------------------------------------------------------------------------
// remove — mutation (host only, cascade-deletes answers)
// ---------------------------------------------------------------------------

export const remove = mutation({
  args: {
    questionId: v.id("hostedQuestions"),
    hostToken: v.string(),
  },
  handler: async (ctx, args) => {
    const hq = await ctx.db.get(args.questionId);
    if (!hq) return null;

    const isHost = await assertHost(ctx, hq.presentationId, args.hostToken);
    if (!isHost) return null;

    const answers = await ctx.db
      .query("hostedAnswers")
      .withIndex("by_question", (q: any) => q.eq("questionId", args.questionId))
      .collect();

    for (const answer of answers) {
      await ctx.db.delete(answer._id);
    }

    await ctx.db.delete(args.questionId);
    return args.questionId;
  },
});

// ---------------------------------------------------------------------------
// submitAnswer — mutation (student)
// ---------------------------------------------------------------------------

export const submitAnswer = mutation({
  args: {
    questionId: v.id("hostedQuestions"),
    participantId: v.string(),
    mcqIndex: v.optional(v.number()),
    freeText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const hq = await ctx.db.get(args.questionId);
    if (!hq) return null;

    // Reject if the question is closed
    if (hq.closedAt !== undefined && hq.closedAt !== null) return null;
    if (!hq.isActive) return null;

    // Also reject if timed and expired (server-side enforcement)
    if (hq.timeLimitMs && hq.startedAt) {
      const deadline = hq.startedAt + hq.timeLimitMs;
      if (Date.now() > deadline) return null;
    }

    // Upsert: one answer per participant per question
    const existing = await ctx.db
      .query("hostedAnswers")
      .withIndex("by_question_participant", (q: any) =>
        q
          .eq("questionId", args.questionId)
          .eq("participantId", args.participantId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        mcqIndex: args.mcqIndex ?? undefined,
        freeText: args.freeText ?? undefined,
        submittedAt: Date.now(),
      });
      return existing._id;
    }

    const id = await ctx.db.insert("hostedAnswers", {
      questionId: args.questionId,
      participantId: args.participantId,
      mcqIndex: args.mcqIndex ?? undefined,
      freeText: args.freeText ?? undefined,
      submittedAt: Date.now(),
    });
    return id;
  },
});
