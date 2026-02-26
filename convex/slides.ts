/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * Convex functions for per-slide canvas data.
 *
 * Reads are public. Writes require the ownerToken to be verified against
 * the presentation's stored hash.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ---------------------------------------------------------------------------
// Internal helper
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
 * List all slides for a presentation, ordered by slideIndex.
 * Does NOT return asset URLs — call getSlideAssets separately.
 */
export const listSlides = query({
  args: { presentationId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("slides")
      .withIndex("by_presentation", (q: any) => q.eq("presentationId", args.presentationId))
      .collect();
    rows.sort((a: any, b: any) => a.slideIndex - b.slideIndex);
    return rows;
  },
});

/**
 * Fetch a single slide by its slideId.
 */
export const getSlide = query({
  args: { slideId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("slides")
      .withIndex("by_slide_id", (q: any) => q.eq("slideId", args.slideId))
      .first();
  },
});

/**
 * Return all asset refs for a slide, each with a signed URL.
 */
export const getSlideAssets = query({
  args: { slideId: v.string() },
  handler: async (ctx, args) => {
    const assets = await ctx.db
      .query("slideAssets")
      .withIndex("by_slide", (q: any) => q.eq("slideId", args.slideId))
      .collect();

    return Promise.all(
      assets.map(async (asset: any) => {
        const url = await ctx.storage.getUrl(asset.storageId);
        return { assetKey: asset.assetKey, storageId: asset.storageId, url };
      }),
    );
  },
});

/**
 * Create a short-lived Convex upload URL for File Storage.
 * Requires owner auth for the presentation to prevent arbitrary uploads.
 */
export const generateUploadUrl = mutation({
  args: {
    presentationId: v.string(),
    ownerToken: v.string(),
  },
  handler: async (ctx, args) => {
    const isOwner = await assertOwner(ctx, args.presentationId, args.ownerToken);
    if (!isOwner) return null;
    return ctx.storage.generateUploadUrl();
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Upsert a single slide's canvas data. Creates the row on first call,
 * updates it on subsequent calls (last-write-wins by updatedAt).
 */
export const saveSlide = mutation({
  args: {
    presentationId: v.string(),
    ownerToken: v.string(),
    slideId: v.string(),
    slideIndex: v.number(),
    engine: v.union(v.literal("tldraw"), v.literal("excalidraw")),
    sceneVersion: v.number(),
    snapshotJson: v.optional(v.string()),
    elementsJson: v.optional(v.string()),
    appStateJson: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const isOwner = await assertOwner(ctx, args.presentationId, args.ownerToken);
    if (!isOwner) return null;

    const { ownerToken: _t, ...rest } = args;

    const existing = await ctx.db
      .query("slides")
      .withIndex("by_slide_id", (q: any) => q.eq("slideId", args.slideId))
      .first();

    if (existing) {
      // Last-write-wins
      if (args.updatedAt < existing.updatedAt) return existing._id;
      await ctx.db.patch(existing._id, {
        slideIndex: rest.slideIndex,
        sceneVersion: rest.sceneVersion,
        snapshotJson: rest.snapshotJson,
        elementsJson: rest.elementsJson,
        appStateJson: rest.appStateJson,
        updatedAt: rest.updatedAt,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("slides", rest);
    return id;
  },
});

/**
 * Record a slide asset (image) that was uploaded to File Storage.
 * Returns the assetKey on success.
 */
export const saveSlideAsset = mutation({
  args: {
    presentationId: v.string(),
    ownerToken: v.string(),
    slideId: v.string(),
    assetKey: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    sizeBytes: v.number(),
    contentHash: v.string(),
  },
  handler: async (ctx, args) => {
    const isOwner = await assertOwner(ctx, args.presentationId, args.ownerToken);
    if (!isOwner) return null;

    // Idempotent — skip if assetKey already registered for this slide
    const existing = await ctx.db
      .query("slideAssets")
      .withIndex("by_slide", (q: any) => q.eq("slideId", args.slideId))
      .collect();
    if (existing.some((a: any) => a.assetKey === args.assetKey)) return args.assetKey;

    const { ownerToken: _t, ...rest } = args;
    await ctx.db.insert("slideAssets", { ...rest, createdAt: Date.now() });
    return args.assetKey;
  },
});

/**
 * Delete a slide and its asset refs from Convex.
 */
export const deleteSlide = mutation({
  args: {
    presentationId: v.string(),
    ownerToken: v.string(),
    slideId: v.string(),
  },
  handler: async (ctx, args) => {
    const isOwner = await assertOwner(ctx, args.presentationId, args.ownerToken);
    if (!isOwner) return null;

    const slide = await ctx.db
      .query("slides")
      .withIndex("by_slide_id", (q: any) => q.eq("slideId", args.slideId))
      .first();
    if (slide) await ctx.db.delete(slide._id);

    // Delete asset DB rows (keep File Storage — shared assets might be referenced elsewhere)
    const assets = await ctx.db
      .query("slideAssets")
      .withIndex("by_slide", (q: any) => q.eq("slideId", args.slideId))
      .collect();
    for (const asset of assets) {
      await ctx.db.delete(asset._id);
    }

    return args.slideId;
  },
});

/**
 * Update the slideIndex of a set of slides (after reorder).
 * Accepts an ordered array of slideIds — assigns index 0…n-1 in order.
 */
export const reorderSlides = mutation({
  args: {
    presentationId: v.string(),
    ownerToken: v.string(),
    orderedSlideIds: v.array(v.string()),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const isOwner = await assertOwner(ctx, args.presentationId, args.ownerToken);
    if (!isOwner) return null;

    const updates = await Promise.all(
      args.orderedSlideIds.map(async (slideId, index) => {
        const row = await ctx.db
          .query("slides")
          .withIndex("by_slide_id", (q: any) => q.eq("slideId", slideId))
          .first();
        if (row) await ctx.db.patch(row._id, { slideIndex: index, updatedAt: args.updatedAt });
        return slideId;
      }),
    );

    return updates;
  },
});
