import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { presentationId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_presentation", (q) =>
        q.eq("presentationId", args.presentationId)
      )
      .order("asc")
      .take(200);
    return messages;
  },
});

export const send = mutation({
  args: {
    presentationId: v.string(),
    participantId: v.string(),
    displayName: v.string(),
    color: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.content.trim();
    if (!trimmed) return null;

    const id = await ctx.db.insert("messages", {
      presentationId: args.presentationId,
      participantId: args.participantId,
      displayName: args.displayName,
      color: args.color,
      content: trimmed,
      createdAt: Date.now(),
    });
    return id;
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
      await ctx.db.delete(message._id);
    }
  },
});
