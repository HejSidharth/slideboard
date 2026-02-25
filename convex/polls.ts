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

        const voteCounts: number[] = poll.options.map(() => 0);
        let myVote = -1;

        for (const vote of votes) {
          if (vote.optionIndex >= 0 && vote.optionIndex < poll.options.length) {
            voteCounts[vote.optionIndex]++;
          }

          if (vote.participantId === args.participantId) {
            myVote = vote.optionIndex;
          }
        }

        const resultsVisible = poll.resultsVisible === true;

        return {
          ...poll,
          resultsVisible,
          voteCounts: resultsVisible ? voteCounts : null,
          totalVotes: votes.length,
          myVote,
        };
      })
    );

    return pollsWithState;
  },
});

export const create = mutation({
  args: {
    presentationId: v.string(),
    question: v.string(),
    options: v.array(v.string()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.question.trim()) return null;
    if (args.options.length < 2) return null;

    const id = await ctx.db.insert("polls", {
      presentationId: args.presentationId,
      question: args.question.trim(),
      options: args.options.map((o) => o.trim()).filter(Boolean),
      createdBy: args.createdBy,
      isActive: true,
      resultsVisible: false,
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
    if (args.optionIndex < 0 || args.optionIndex >= poll.options.length) {
      return null;
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
