import { NextResponse } from "next/server";

const GROK_API_URL = "https://api.x.ai/v1/chat/completions";

interface PageResult {
  pageNumber: number;
  problems: {
    problemNumber: string;
    boundingBox: {
      top: number;
      left: number;
      width: number;
      height: number;
    };
    description: string;
  }[];
}

interface RequestBody {
  pageImages: string[];
}

const SYSTEM_PROMPT = `You are a document analyzer specializing in educational materials. You analyze images of document pages and identify individual problems, questions, or exercises.

For each problem you identify, provide:
1. The problem number or label (e.g., "1", "2a", "Problem 3", "Q5")
2. A bounding box as percentages of the page dimensions (top, left, width, height), where 0 is the top/left edge and 100 is the bottom/right edge
3. A brief 1-line description of what the problem asks

Rules:
- Include ALL problems visible on the page
- The bounding box should tightly contain the full problem text, any diagrams, sub-parts, and answer space
- Add 2-3% padding around each problem's bounding box for clean cropping
- If problems are numbered, use that number. If not, assign sequential numbers.
- For multi-part problems (a, b, c), group them as one problem unless they are clearly separated
- Ignore page headers, footers, titles, and instructions that are not problems themselves

Return ONLY valid JSON matching this exact schema:
{
  "problems": [
    {
      "problemNumber": "string",
      "boundingBox": { "top": number, "left": number, "width": number, "height": number },
      "description": "string"
    }
  ]
}`;

export async function POST(request: Request) {
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "XAI_API_KEY is missing on the server." },
      { status: 500 },
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.pageImages) || body.pageImages.length === 0) {
    return NextResponse.json(
      { error: "Request must include a non-empty pageImages array." },
      { status: 400 },
    );
  }

  const results: PageResult[] = [];

  for (let i = 0; i < body.pageImages.length; i++) {
    const pageImage = body.pageImages[i];

    try {
      const upstream = await fetch(GROK_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-4-1-fast-non-reasoning",
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this document page (page ${i + 1}) and identify all individual problems/questions. Return the JSON response.`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: pageImage,
                  },
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0,
          max_tokens: 4096,
        }),
      });

      if (!upstream.ok) {
        const errorText = await upstream.text();
        console.error(`Grok API error for page ${i + 1}: ${upstream.status} - ${errorText}`);
        results.push({ pageNumber: i + 1, problems: [] });
        continue;
      }

      const data = await upstream.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        results.push({ pageNumber: i + 1, problems: [] });
        continue;
      }

      const parsed = JSON.parse(content);
      const problems = Array.isArray(parsed.problems) ? parsed.problems : [];

      results.push({
        pageNumber: i + 1,
        problems: problems.map((p: Record<string, unknown>) => ({
          problemNumber: String(p.problemNumber ?? ""),
          boundingBox: {
            top: Number((p.boundingBox as Record<string, unknown>)?.top ?? 0),
            left: Number((p.boundingBox as Record<string, unknown>)?.left ?? 0),
            width: Number((p.boundingBox as Record<string, unknown>)?.width ?? 100),
            height: Number((p.boundingBox as Record<string, unknown>)?.height ?? 100),
          },
          description: String(p.description ?? ""),
        })),
      });
    } catch (error) {
      console.error(`Failed to process page ${i + 1}:`, error);
      results.push({ pageNumber: i + 1, problems: [] });
    }
  }

  return NextResponse.json({ pages: results });
}
