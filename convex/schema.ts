import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
});
