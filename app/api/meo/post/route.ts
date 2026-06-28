import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  content: z.string().min(1).max(1500),
  type: z.enum(["WHATS_NEW", "EVENT", "OFFER", "PRODUCT"]).optional().default("WHATS_NEW"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, type } = schema.parse(body);

    const { createGooglePost } = await import("@/lib/google-business");
    const result = await createGooglePost(content, type);
    return NextResponse.json({ success: true, post: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("[meo/post]", error);
    return NextResponse.json({ error: "Failed to create Google Business post" }, { status: 500 });
  }
}
