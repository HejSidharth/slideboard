import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    presentationId: v.string(),
    participantId: v.string(),
    displayName: v.string(),
    color: v.string(),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_presentation", ["presentationId", "createdAt"]),

  polls: defineTable({
    presentationId: v.string(),
    question: v.string(),
    options: v.array(v.string()),
    createdBy: v.string(),
    isActive: v.boolean(),
    resultsVisible: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_presentation", ["presentationId", "createdAt"]),

  votes: defineTable({
    pollId: v.id("polls"),
    participantId: v.string(),
    optionIndex: v.number(),
    createdAt: v.number(),
  })
    .index("by_poll", ["pollId"])
    .index("by_poll_participant", ["pollId", "participantId"]),
});
