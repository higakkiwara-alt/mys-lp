import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthFromRequest } from "@/lib/auth";

const ALLOWED_PLATFORMS = ["google", "line", "wordpress", "tiktok", "youtube", "x", "note"] as const;

const schema = z.object({
  content: z.string().min(1).max(2000),
  platforms: z.array(z.enum(ALLOWED_PLATFORMS)).min(1).max(7),
});

export async function POST(req: NextRequest) {
  const authErr = requireAuthFromRequest(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { content, platforms } = schema.parse(body);

    const { expandContent } = await import("@/lib/claude");
    const expansions = await expandContent(content, platforms);

    return NextResponse.json({ expansions });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("[content/route]", error);
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
}
