/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * HTTP actions for Convex File Storage integration.
 *
 * POST /upload-asset — receives a binary blob, stores it, returns the storageId.
 *
 * The endpoint is called by the client-side asset extractor before writing
 * slide data to the DB. No auth here — the mutation saveSlideAsset verifies
 * the ownerToken later.
 */

import { httpAction } from "./_generated/server";
import { httpRouter } from "convex/server";

const http = httpRouter();

http.route({
  path: "/upload-asset",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const blob = await request.blob();
    const storageId = await ctx.storage.store(blob);
    return new Response(JSON.stringify({ storageId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * GET /asset/:storageId — redirect to the Convex-generated serving URL.
 * Useful for sharing URLs that don't expire for the lifetime of the session.
 */
http.route({
  path: "/asset",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const storageId = url.searchParams.get("id");
    if (!storageId) {
      return new Response("Missing id parameter", { status: 400 });
    }
    const servingUrl = await ctx.storage.getUrl(storageId as any);
    if (!servingUrl) {
      return new Response("Asset not found", { status: 404 });
    }
    return Response.redirect(servingUrl, 302);
  }),
});

export default http;
