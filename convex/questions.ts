import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ---------------------------------------------------------------------------
// Host session helpers
// ---------------------------------------------------------------------------

/**
 * Register a host token for a presentation (idempotent — first write wins).
 * Call this once when the host first opens the Q&A panel.
 * Returns true if the token is now authoritative for this presentation.
 */
export const registerHost = mutation({
  args: {
    presentationId: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.token) return false;

    const existing = await ctx.db
      .query("hostSessions")
      .withIndex("by_presentation", (q: any) =>
        q.eq("presentationId", args.presentationId)
      )
      .first();

    if (existing) {
      // Only the original token is valid
      return existing.token === args.token;
    }

    await ctx.db.insert("hostSessions", {
      presentationId: args.presentationId,
      token: args.token,
      createdAt: Date.now(),
    });
    return true;
  },
});

/**
 * Verify a host token — returns true if the token matches the registered host
 * for this presentation.
 */
export const verifyHost = query({
  args: {
    presentationId: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.token) return false;
    const existing = await ctx.db
      .query("hostSessions")
      .withIndex("by_token", (q: any) =>
        q.eq("presentationId", args.presentationId).eq("token", args.token)
      )
      .first();
    return existing !== null;
  },
});

/** Internal helper to check host auth — used inside mutations. */
async function assertHost(
  ctx: { db: any },
  presentationId: string,
  hostToken: string
): Promise<boolean> {
  if (!hostToken) return false;
  const session = await ctx.db
    .query("hostSessions")
    .withIndex("by_token", (q: any) =>
      q.eq("presentationId", presentationId).eq("token", hostToken)
    )
    .first();
  return session !== null;
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export const list = query({
  args: {
    presentationId: v.string(),
    participantId: v.string(),
    /** If provided and valid, hidden questions are also returned (host view). */
    hostToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const isHost = args.hostToken
      ? await assertHost(ctx, args.presentationId, args.hostToken)
      : false;

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_presentation", (q: any) =>
        q.eq("presentationId", args.presentationId)
      )
      .order("asc")
      .collect();

    const enriched = await Promise.all(
      questions
        .filter((q: any) => isHost || !q.isHidden)
        .map(async (question: any) => {
          const vote = await ctx.db
            .query("questionVotes")
            .withIndex("by_question_voter", (q: any) =>
              q
                .eq("questionId", question._id)
                .eq("voterId", args.participantId)
            )
            .first();

          return {
            ...question,
            myUpvote: vote !== null,
            isHost,
          };
        })
    );

    // Sort: unanswered first by upvotes desc, then answered by upvotes desc
    enriched.sort((a: any, b: any) => {
      if (a.isAnswered !== b.isAnswered) return a.isAnswered ? 1 : -1;
      return b.upvotes - a.upvotes;
    });

    return enriched;
  },
});

export const ask = mutation({
  args: {
    presentationId: v.string(),
    text: v.string(),
    askedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.text.trim();
    if (!trimmed) return null;

    const id = await ctx.db.insert("questions", {
      presentationId: args.presentationId,
      text: trimmed,
      askedBy: args.askedBy,
      upvotes: 0,
      isAnswered: false,
      isHidden: false,
      createdAt: Date.now(),
    });
    return id;
  },
});

export const toggleUpvote = mutation({
  args: {
    questionId: v.id("questions"),
    voterId: v.string(),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question) return null;

    // Students cannot upvote their own question
    if (question.askedBy === args.voterId) return null;

    const existing = await ctx.db
      .query("questionVotes")
      .withIndex("by_question_voter", (q: any) =>
        q.eq("questionId", args.questionId).eq("voterId", args.voterId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.questionId, {
        upvotes: Math.max(0, question.upvotes - 1),
      });
      return { action: "removed" as const };
    }

    await ctx.db.insert("questionVotes", {
      questionId: args.questionId,
      voterId: args.voterId,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.questionId, {
      upvotes: question.upvotes + 1,
    });
    return { action: "added" as const };
  },
});

export const markAnswered = mutation({
  args: {
    questionId: v.id("questions"),
    hostToken: v.string(),
    answered: v.boolean(),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question) return null;

    const isHost = await assertHost(ctx, question.presentationId, args.hostToken);
    if (!isHost) return null;

    await ctx.db.patch(args.questionId, { isAnswered: args.answered });
    return args.questionId;
  },
});

export const setHidden = mutation({
  args: {
    questionId: v.id("questions"),
    hostToken: v.string(),
    hidden: v.boolean(),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question) return null;

    const isHost = await assertHost(ctx, question.presentationId, args.hostToken);
    if (!isHost) return null;

    await ctx.db.patch(args.questionId, { isHidden: args.hidden });
    return args.questionId;
  },
});

export const remove = mutation({
  args: {
    questionId: v.id("questions"),
    hostToken: v.string(),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question) return null;

    const isHost = await assertHost(ctx, question.presentationId, args.hostToken);
    if (!isHost) return null;

    // Cascade delete votes
    const votes = await ctx.db
      .query("questionVotes")
      .withIndex("by_question", (q: any) => q.eq("questionId", args.questionId))
      .collect();

    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }

    await ctx.db.delete(args.questionId);
    return args.questionId;
  },
});
