import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {
    presentationId: v.string(),
    participantId: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_presentation", (q) =>
        q.eq("presentationId", args.presentationId)
      )
      .order("asc")
      .take(200);

    // Enrich each message with like data
    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const likes = await ctx.db
          .query("likes")
          .withIndex("by_message", (q) => q.eq("messageId", msg._id))
          .collect();

        const likeCount = likes.length;
        const liked = likes.some((l) => l.participantId === args.participantId);

        return { ...msg, likeCount, liked };
      })
    );

    return enriched;
  },
});

export const send = mutation({
  args: {
    presentationId: v.string(),
    participantId: v.string(),
    displayName: v.string(),
    color: v.string(),
    content: v.string(),
    clientMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trimmed = args.content.trim();
    if (!trimmed) return null;

    // Deduplicate: if clientMessageId provided, check for existing message
    if (args.clientMessageId) {
      const existing = await ctx.db
        .query("messages")
        .withIndex("by_client_message", (q: any) =>
          q
            .eq("presentationId", args.presentationId)
            .eq("clientMessageId", args.clientMessageId)
        )
        .first();
      if (existing) return existing._id;
    }

    const id = await ctx.db.insert("messages", {
      presentationId: args.presentationId,
      participantId: args.participantId,
      displayName: args.displayName,
      color: args.color,
      content: trimmed,
      clientMessageId: args.clientMessageId,
      createdAt: Date.now(),
    });
    return id;
  },
});

export const toggleLike = mutation({
  args: {
    messageId: v.id("messages"),
    participantId: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    // Check if already liked
    const existing = await ctx.db
      .query("likes")
      .withIndex("by_message_participant", (q: any) =>
        q
          .eq("messageId", args.messageId)
          .eq("participantId", args.participantId)
      )
      .first();

    if (existing) {
      // Unlike
      await ctx.db.delete(existing._id);
      return { action: "unliked" as const };
    }

    // Like
    await ctx.db.insert("likes", {
      messageId: args.messageId,
      participantId: args.participantId,
      createdAt: Date.now(),
    });
    return { action: "liked" as const };
  },
});

export const clear = mutation({
  args: { presentationId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_presentation", (q) =>
        q.eq("presentationId", args.presentationId)
      )
      .collect();

    for (const message of messages) {
      // Also delete likes for this message
      const likes = await ctx.db
        .query("likes")
        .withIndex("by_message", (q) => q.eq("messageId", message._id))
        .collect();
      for (const like of likes) {
        await ctx.db.delete(like._id);
      }
      await ctx.db.delete(message._id);
    }
  },
});
