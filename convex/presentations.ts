/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * Convex functions for presentation metadata.
 *
 * All write mutations require the plain ownerToken. The server checks it
 * against the stored SHA-256 hash so the raw token is never persisted.
 *
 * Reads are public — anyone with the presentationId can fetch metadata.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ---------------------------------------------------------------------------
// Internal helpers
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
    .withIndex("by_presentation_id", (q: any) => q.eq("presentationId", presentationId))
    .first();
  if (!row) return false;
  const hash = await sha256Hex(ownerToken);
  return row.ownerTokenHash === hash;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch metadata for a single presentation (public — no token required).
 */
export const getPresentation = query({
  args: { presentationId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("storedPresentations")
      .withIndex("by_presentation_id", (q: any) => q.eq("presentationId", args.presentationId))
      .first();
    if (!row) return null;
    // Never return the ownerTokenHash
    const { ownerTokenHash: _ownerTokenHash, ...safe } = row;
    return safe;
  },
});

/**
 * Returns whether the caller is the owner of the presentation.
 */
export const verifyOwner = query({
  args: {
    presentationId: v.string(),
    ownerToken: v.string(),
  },
  handler: async (ctx, args) => {
    return assertOwner(ctx, args.presentationId, args.ownerToken);
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Create a new presentation row. Idempotent — if the presentationId already
 * exists and the token matches, it succeeds without creating a duplicate.
 */
export const createPresentation = mutation({
  args: {
    presentationId: v.string(),
    name: v.string(),
    canvasEngine: v.union(v.literal("tldraw"), v.literal("excalidraw")),
    folderId: v.optional(v.string()),
    currentSlideIndex: v.number(),
    version: v.number(),
    ownerToken: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { ownerToken, ...rest } = args;
    if (!ownerToken) return null;

    const existing = await ctx.db
      .query("storedPresentations")
      .withIndex("by_presentation_id", (q: any) => q.eq("presentationId", args.presentationId))
      .first();

    if (existing) {
      // Already exists — verify ownership before treating as success
      const hash = await sha256Hex(ownerToken);
      return existing.ownerTokenHash === hash ? existing._id : null;
    }

    const ownerTokenHash = await sha256Hex(ownerToken);
    const id = await ctx.db.insert("storedPresentations", {
      ...rest,
      ownerTokenHash,
    });
    return id;
  },
});

/**
 * Update presentation metadata (name, folderId, currentSlideIndex, etc.).
 */
export const updatePresentation = mutation({
  args: {
    presentationId: v.string(),
    ownerToken: v.string(),
    name: v.optional(v.string()),
    folderId: v.optional(v.union(v.string(), v.null())),
    currentSlideIndex: v.optional(v.number()),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const isOwner = await assertOwner(ctx, args.presentationId, args.ownerToken);
    if (!isOwner) return null;

    const row = await ctx.db
      .query("storedPresentations")
      .withIndex("by_presentation_id", (q: any) => q.eq("presentationId", args.presentationId))
      .first();
    if (!row) return null;

    const patch: Record<string, unknown> = { updatedAt: args.updatedAt };
    if (args.name !== undefined) patch.name = args.name;
    if (args.folderId !== undefined) patch.folderId = args.folderId;
    if (args.currentSlideIndex !== undefined) patch.currentSlideIndex = args.currentSlideIndex;

    await ctx.db.patch(row._id, patch);
    return row._id;
  },
});

/**
 * Delete a presentation and all its slides/assets.
 */
export const deletePresentation = mutation({
  args: {
    presentationId: v.string(),
    ownerToken: v.string(),
  },
  handler: async (ctx, args) => {
    const isOwner = await assertOwner(ctx, args.presentationId, args.ownerToken);
    if (!isOwner) return null;

    // Delete all slides
    const slides = await ctx.db
      .query("slides")
      .withIndex("by_presentation", (q: any) => q.eq("presentationId", args.presentationId))
      .collect();
    for (const slide of slides) {
      await ctx.db.delete(slide._id);
    }

    // Delete all asset refs (file storage entries themselves stay — GC handled separately)
    const assets = await ctx.db
      .query("slideAssets")
      .withIndex("by_presentation", (q: any) => q.eq("presentationId", args.presentationId))
      .collect();
    for (const asset of assets) {
      await ctx.storage.delete(asset.storageId);
      await ctx.db.delete(asset._id);
    }

    // Delete presentation row
    const row = await ctx.db
      .query("storedPresentations")
      .withIndex("by_presentation_id", (q: any) => q.eq("presentationId", args.presentationId))
      .first();
    if (row) await ctx.db.delete(row._id);

    return args.presentationId;
  },
});
