import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  content: z.string().min(1).max(2000),
  platforms: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, platforms } = schema.parse(body);

    const { expandContent } = await import("@/lib/claude");
    const expansions = await expandContent(content, platforms);

    return NextResponse.json({ expansions });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }
    console.error("[content/route]", error);
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
}
