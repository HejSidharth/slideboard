import { NextResponse } from "next/server";

const ZAI_API_URL = "https://api.z.ai/api/paas/v4/chat/completions";
const ZAI_LAYOUT_PARSING_API_URL = "https://api.z.ai/api/paas/v4/layout_parsing";

interface OpenRouterRequestMessage {
  role: "user" | "assistant" | "system";
  content:
    | string
    | OpenRouterContentPart[];
}

interface OpenRouterTextPart {
  type: "text";
  text: string;
}

interface OpenRouterImagePart {
  type: "image_url";
  image_url: { url: string };
}

type OpenRouterContentPart = OpenRouterTextPart | OpenRouterImagePart;

interface RequestBody {
  messages?: OpenRouterRequestMessage[];
  stream?: boolean;
}

interface NormalizedRequestMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

function isTextPart(
  part: OpenRouterContentPart,
): part is OpenRouterTextPart {
  return part.type === "text";
}

function isImagePart(
  part: OpenRouterContentPart,
): part is OpenRouterImagePart {
  return part.type === "image_url";
}

async function runLayoutParsing(apiKey: string, file: string): Promise<string> {
  const response = await fetch(ZAI_LAYOUT_PARSING_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Accept-Language": "en-US,en",
    },
    body: JSON.stringify({
      model: "glm-ocr",
      file,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Z.ai layout parsing error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as { md_results?: string };
  return typeof data.md_results === "string" ? data.md_results.trim() : "";
}

async function normalizeMessages(
  messages: OpenRouterRequestMessage[],
  apiKey: string,
): Promise<NormalizedRequestMessage[]> {
  return Promise.all(
    messages.map(async (message) => {
      if (typeof message.content === "string") {
        return {
          role: message.role,
          content: message.content,
        };
      }

      const segments: string[] = [];

      for (const part of message.content) {
        if (isTextPart(part)) {
          if (part.text.trim()) {
            segments.push(part.text.trim());
          }
          continue;
        }

        if (isImagePart(part)) {
          const parsed = await runLayoutParsing(apiKey, part.image_url.url);
          segments.push(
            parsed
              ? `Parsed slide content:\n${parsed}`
              : "Parsed slide content: [No text could be extracted from the image.]",
          );
        }
      }

      return {
        role: message.role,
        content: segments.join("\n\n").trim(),
      };
    }),
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.ZAI_API_KEY;
  const defaultModel = process.env.ZAI_MODEL ?? "glm-5";

  if (!apiKey) {
    return NextResponse.json(
      { error: "ZAI_API_KEY is missing on the server." },
      { status: 500 },
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: "Request must include a non-empty messages array." },
      { status: 400 },
    );
  }

  const stream = body.stream === true;
  try {
    const normalizedMessages = await normalizeMessages(body.messages, apiKey);
    const upstream = await fetch(ZAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept-Language": "en-US,en",
      },
      body: JSON.stringify({
        model: defaultModel,
        messages: normalizedMessages,
        stream,
      }),
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      return NextResponse.json(
        { error: `Z.ai API error: ${upstream.status} - ${errorText}` },
        { status: upstream.status },
      );
    }

    if (stream) {
      return new Response(upstream.body, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown assistant server error.";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
