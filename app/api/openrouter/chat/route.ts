import { NextResponse } from "next/server";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

interface OpenRouterRequestMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestBody {
  messages?: OpenRouterRequestMessage[];
  stream?: boolean;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is missing on the server." },
      { status: 500 },
    );
  }

  if (!model) {
    return NextResponse.json(
      { error: "OPENROUTER_MODEL is missing on the server." },
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
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;

  const upstream = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": origin,
      "X-Title": "SlideBoard",
    },
    body: JSON.stringify({
      model,
      messages: body.messages,
      stream,
    }),
  });

  if (!upstream.ok) {
    const errorText = await upstream.text();
    return NextResponse.json(
      { error: `OpenRouter API error: ${upstream.status} - ${errorText}` },
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
}
