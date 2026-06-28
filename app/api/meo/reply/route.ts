import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  author: z.string(),
  rating: z.number().int().min(1).max(5),
  text: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const review = schema.parse(body);

    const { generateReviewReply } = await import("@/lib/claude");
    const reply = await generateReviewReply(review);
    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("[meo/reply]", error);
    return NextResponse.json({ error: "Failed to generate reply" }, { status: 500 });
  }
}
