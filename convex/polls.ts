import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {
    presentationId: v.string(),
    participantId: v.string(),
  },
  handler: async (ctx, args) => {
    const polls = await ctx.db
      .query("polls")
      .withIndex("by_presentation", (q) =>
        q.eq("presentationId", args.presentationId)
      )
      .order("desc")
      .take(50);

    const pollsWithState = await Promise.all(
      polls.map(async (poll) => {
        const votes = await ctx.db
          .query("votes")
          .withIndex("by_poll", (q) => q.eq("pollId", poll._id))
          .collect();

        const type = poll.pollType ?? "multiple_choice";
        const slotCount = type === "confidence" ? 5 : poll.options.length;
        const voteCounts: number[] = Array(slotCount).fill(0);
        let myVote = -1;

        for (const vote of votes) {
          if (vote.optionIndex >= 0 && vote.optionIndex < slotCount) {
            voteCounts[vote.optionIndex]++;
          }

          if (vote.participantId === args.participantId) {
            myVote = vote.optionIndex;
          }
        }

        const resultsVisible = poll.resultsVisible === true;

        // Poll likes
        const pollLikes = await ctx.db
          .query("pollLikes")
          .withIndex("by_poll", (q: any) => q.eq("pollId", poll._id))
          .collect();

        const pollLikeCount = pollLikes.length;
        const pollLiked = pollLikes.some(
          (l) => l.participantId === args.participantId
        );

        return {
          ...poll,
          pollType: type,
          resultsVisible,
          voteCounts: resultsVisible ? voteCounts : null,
          totalVotes: votes.length,
          myVote,
          pollLikeCount,
          pollLiked,
        };
      })
    );

    return pollsWithState;
  },
});

/**
 * Helper: close all currently active polls for a presentation.
 * Used to enforce single-active-poll mode.
 */
async function closeActivePolls(
  ctx: { db: any },
  presentationId: string,
  excludePollId?: string
) {
  const activePolls = await ctx.db
    .query("polls")
    .withIndex("by_presentation", (q: any) =>
      q.eq("presentationId", presentationId)
    )
    .collect();

  for (const poll of activePolls) {
    if (poll.isActive && poll._id !== excludePollId) {
      await ctx.db.patch(poll._id, { isActive: false });
    }
  }
}

export const create = mutation({
  args: {
    presentationId: v.string(),
    question: v.string(),
    options: v.array(v.string()),
    pollType: v.optional(v.union(v.literal("multiple_choice"), v.literal("confidence"))),
    createdBy: v.string(),
    clientRequestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.question.trim()) return null;
    const type = args.pollType ?? "multiple_choice";
    if (type === "multiple_choice" && args.options.length < 2) return null;

    // Deduplicate: if clientRequestId provided, check for existing poll
    if (args.clientRequestId) {
      const existing = await ctx.db
        .query("polls")
        .withIndex("by_client_request", (q: any) =>
          q
            .eq("presentationId", args.presentationId)
            .eq("clientRequestId", args.clientRequestId)
        )
        .first();
      if (existing) return existing._id;
    }

    // Single active poll: close all other active polls
    await closeActivePolls(ctx, args.presentationId);

    const id = await ctx.db.insert("polls", {
      presentationId: args.presentationId,
      question: args.question.trim(),
      options: args.options.map((o) => o.trim()).filter(Boolean),
      pollType: type,
      createdBy: args.createdBy,
      isActive: true,
      resultsVisible: false,
      clientRequestId: args.clientRequestId,
      createdAt: Date.now(),
    });
    return id;
  },
});

export const close = mutation({
  args: {
    pollId: v.id("polls"),
    participantId: v.string(),
  },
  handler: async (ctx, args) => {
    const poll = await ctx.db.get(args.pollId);
    if (!poll || poll.createdBy !== args.participantId) return null;

    await ctx.db.patch(args.pollId, { isActive: false });
    return args.pollId;
  },
});

export const reopen = mutation({
  args: {
    pollId: v.id("polls"),
    participantId: v.string(),
  },
  handler: async (ctx, args) => {
    const poll = await ctx.db.get(args.pollId);
    if (!poll || poll.createdBy !== args.participantId) return null;

    // Single active poll: close all other active polls first
    await closeActivePolls(ctx, poll.presentationId, args.pollId);

    await ctx.db.patch(args.pollId, { isActive: true });
    return args.pollId;
  },
});

export const setResultsVisible = mutation({
  args: {
    pollId: v.id("polls"),
    participantId: v.string(),
    visible: v.boolean(),
  },
  handler: async (ctx, args) => {
    const poll = await ctx.db.get(args.pollId);
    if (!poll || poll.createdBy !== args.participantId) return null;

    await ctx.db.patch(args.pollId, { resultsVisible: args.visible });
    return args.pollId;
  },
});

export const remove = mutation({
  args: {
    pollId: v.id("polls"),
    participantId: v.string(),
  },
  handler: async (ctx, args) => {
    const poll = await ctx.db.get(args.pollId);
    if (!poll || poll.createdBy !== args.participantId) return null;

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_poll", (q) => q.eq("pollId", args.pollId))
      .collect();

    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }

    // Also delete poll likes
    const pollLikes = await ctx.db
      .query("pollLikes")
      .withIndex("by_poll", (q: any) => q.eq("pollId", args.pollId))
      .collect();

    for (const like of pollLikes) {
      await ctx.db.delete(like._id);
    }

    await ctx.db.delete(args.pollId);
    return args.pollId;
  },
});

export const vote = mutation({
  args: {
    pollId: v.id("polls"),
    participantId: v.string(),
    optionIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const poll = await ctx.db.get(args.pollId);
    if (!poll || !poll.isActive) return null;

    const type = poll.pollType ?? "multiple_choice";
    if (type === "multiple_choice") {
      if (args.optionIndex < 0 || args.optionIndex >= poll.options.length) {
        return null;
      }
    } else {
      // confidence: valid indices 0–4 (stars 1–5)
      if (args.optionIndex < 0 || args.optionIndex > 4) return null;
    }

    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_poll_participant", (q: any) =>
        q.eq("pollId", args.pollId).eq("participantId", args.participantId)
      )
      .first();

    if (existingVote) {
      await ctx.db.patch(existingVote._id, {
        optionIndex: args.optionIndex,
        createdAt: Date.now(),
      });
      return existingVote._id;
    }

    const id = await ctx.db.insert("votes", {
      pollId: args.pollId,
      participantId: args.participantId,
      optionIndex: args.optionIndex,
      createdAt: Date.now(),
    });
    return id;
  },
});

export const togglePollLike = mutation({
  args: {
    pollId: v.id("polls"),
    participantId: v.string(),
  },
  handler: async (ctx, args) => {
    const poll = await ctx.db.get(args.pollId);
    if (!poll) return null;

    const existing = await ctx.db
      .query("pollLikes")
      .withIndex("by_poll_participant", (q: any) =>
        q.eq("pollId", args.pollId).eq("participantId", args.participantId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { action: "unliked" as const };
    }

    await ctx.db.insert("pollLikes", {
      pollId: args.pollId,
      participantId: args.participantId,
      createdAt: Date.now(),
    });
    return { action: "liked" as const };
  },
});
