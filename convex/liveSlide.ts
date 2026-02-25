/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Convex functions for the live canvas broadcast feature.
 *
 * The presenter's browser upserts one row per presentation on a ~2 s throttle.
 * Viewers subscribe to the row via a reactive `useQuery` call; Convex pushes
 * diffs automatically so viewers see near-real-time canvas updates.
 *
 * Reads are public. Writes require the ownerToken.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ---------------------------------------------------------------------------
// Internal helpers (copied from slides.ts to keep this file self-contained)
// ---------------------------------------------------------------------------

async function sha256Hex(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function assertOwner(
  ctx: { db: any },
  presentationId: string,
  ownerToken: string,
): Promise<boolean> {
  if (!ownerToken) return false;
  const row = await ctx.db
    .query("storedPresentations")
    .withIndex("by_presentation_id", (q: any) =>
      q.eq("presentationId", presentationId),
    )
    .first();
  if (!row) return false;
  const hash = await sha256Hex(ownerToken);
  return row.ownerTokenHash === hash;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Fetch the current live slide state for a presentation.
 * Returns null if the presenter has never broadcast or has stopped.
 */
export const get = query({
  args: { presentationId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("liveSlideState")
      .withIndex("by_presentation_id", (q: any) =>
        q.eq("presentationId", args.presentationId),
      )
      .first();
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Upsert the live canvas state for the current slide.
 * Only the presentation owner (verified via ownerToken) may call this.
 *
 * `snapshotJson` should be a JSON string of the shape graph only —
 * no binary asset data (images, PDFs). Shapes that reference asset IDs will
 * appear as broken placeholders on viewer canvases until assets are loaded,
 * which is acceptable for a live "see what's being drawn" experience.
 */
export const upsert = mutation({
  args: {
    presentationId: v.string(),
    ownerToken: v.string(),
    slideId: v.string(),
    slideIndex: v.number(),
    engine: v.union(v.literal("tldraw"), v.literal("excalidraw")),
    snapshotJson: v.string(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const isOwner = await assertOwner(ctx, args.presentationId, args.ownerToken);
    if (!isOwner) return null;

    const existing = await ctx.db
      .query("liveSlideState")
      .withIndex("by_presentation_id", (q: any) =>
        q.eq("presentationId", args.presentationId),
      )
      .first();

    const payload = {
      presentationId: args.presentationId,
      slideId: args.slideId,
      slideIndex: args.slideIndex,
      engine: args.engine,
      snapshotJson: args.snapshotJson,
      updatedAt: args.updatedAt,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return ctx.db.insert("liveSlideState", payload);
  },
});

/**
 * Clear the live state when the presenter stops broadcasting
 * (e.g. closes present mode). Optional — viewers will simply see
 * stale data if this is not called.
 */
export const clear = mutation({
  args: {
    presentationId: v.string(),
    ownerToken: v.string(),
  },
  handler: async (ctx, args) => {
    const isOwner = await assertOwner(ctx, args.presentationId, args.ownerToken);
    if (!isOwner) return null;

    const existing = await ctx.db
      .query("liveSlideState")
      .withIndex("by_presentation_id", (q: any) =>
        q.eq("presentationId", args.presentationId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return args.presentationId;
  },
});
