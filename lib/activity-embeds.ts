import type {
  EmbedProvider,
  EmbedRenderMode,
} from "@/types";

export interface ActivityEmbedConfig {
  provider: EmbedProvider;
  url: string;
  embedUrl: string | null;
  title: string;
  renderMode: EmbedRenderMode;
}

interface ProviderMatch {
  provider: EmbedProvider;
  canonicalUrl: string;
  embedUrl: string | null;
  renderMode: EmbedRenderMode;
}

const PROVIDER_LABELS: Record<EmbedProvider, string> = {
  generic: "Activity",
  kahoot: "Kahoot",
  gimkit: "Gimkit",
  quizizz: "Quizizz",
  youtube: "YouTube",
};

function normalizeUrl(rawUrl: string): URL | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed);
  } catch {
    try {
      return new URL(`https://${trimmed}`);
    } catch {
      return null;
    }
  }
}

function buildKahootMatch(url: URL): ProviderMatch | null {
  if (!/(^|\.)kahoot\.(com|it)$/i.test(url.hostname)) return null;

  const pathSegments = url.pathname.split("/").filter(Boolean);
  const lastSegment = pathSegments[pathSegments.length - 1] ?? "";
  const quizIdParam = url.searchParams.get("quizId");
  const kahootId =
    (quizIdParam && /^[a-z0-9-]+$/i.test(quizIdParam) ? quizIdParam : null) ??
    (/^[a-z0-9-]+$/i.test(lastSegment) ? lastSegment : null);
  const isEmbed = url.hostname === "embed.kahoot.it" || url.pathname.includes("/embed/");

  return {
    provider: "kahoot",
    canonicalUrl: url.toString(),
    embedUrl: isEmbed
      ? url.toString()
      : kahootId
        ? `https://embed.kahoot.it/${kahootId}`
        : null,
    renderMode: isEmbed || kahootId ? "embed" : "launch-only",
  };
}

function buildGimkitMatch(url: URL): ProviderMatch | null {
  if (!/(^|\.)gimkit\.com$/i.test(url.hostname)) return null;

  return {
    provider: "gimkit",
    canonicalUrl: url.toString(),
    embedUrl: url.toString(),
    renderMode: "embed",
  };
}

function buildQuizizzMatch(url: URL): ProviderMatch | null {
  if (!/(^|\.)quizizz\.com$/i.test(url.hostname)) return null;

  return {
    provider: "quizizz",
    canonicalUrl: url.toString(),
    embedUrl: url.toString(),
    renderMode: "embed",
  };
}

function buildYouTubeMatch(url: URL): ProviderMatch | null {
  const isYoutubeHost =
    /(^|\.)youtube\.com$/i.test(url.hostname) ||
    /(^|\.)youtu\.be$/i.test(url.hostname);

  if (!isYoutubeHost) return null;

  const videoId =
    url.searchParams.get("v") ??
    (/^youtu\.be$/i.test(url.hostname) || /(^|\.)youtu\.be$/i.test(url.hostname)
      ? url.pathname.split("/").filter(Boolean)[0] ?? null
      : null);

  if (!videoId) {
    return {
      provider: "youtube",
      canonicalUrl: url.toString(),
      embedUrl: url.toString(),
      renderMode: "embed",
    };
  }

  return {
    provider: "youtube",
    canonicalUrl: url.toString(),
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
    renderMode: "embed",
  };
}

function matchProvider(url: URL): ProviderMatch {
  return (
    buildKahootMatch(url) ??
    buildGimkitMatch(url) ??
    buildQuizizzMatch(url) ??
    buildYouTubeMatch(url) ?? {
      provider: "generic",
      canonicalUrl: url.toString(),
      embedUrl: url.toString(),
      renderMode: "embed",
    }
  );
}

function inferTitle(provider: EmbedProvider, url: URL): string {
  const path = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean).slice(-1)[0];
  if (path) {
    return `${PROVIDER_LABELS[provider]} ${path.replace(/[-_]/g, " ")}`;
  }
  return `${PROVIDER_LABELS[provider]} activity`;
}

export function getProviderLabel(provider: EmbedProvider): string {
  return PROVIDER_LABELS[provider];
}

export function parseActivityEmbedInput(
  rawUrl: string,
  overrideTitle?: string,
): { config: ActivityEmbedConfig | null; error: string | null } {
  const parsedUrl = normalizeUrl(rawUrl);
  if (!parsedUrl) {
    return {
      config: null,
      error: "Enter a valid activity URL.",
    };
  }

  const match = matchProvider(parsedUrl);

  return {
    config: {
      provider: match.provider,
      url: match.canonicalUrl,
      embedUrl: match.embedUrl,
      renderMode: match.renderMode,
      title: overrideTitle?.trim() || inferTitle(match.provider, parsedUrl),
    },
    error: null,
  };
}
