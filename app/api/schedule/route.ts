import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const scheduleSchema = z.object({
  content: z.string().min(1),
  platform: z.string(),
  scheduledAt: z.string().datetime(),
  imageUrl: z.string().url().optional(),
});

export async function GET() {
  const { getAll } = await import("@/lib/scheduler");
  return NextResponse.json({ posts: getAll() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = scheduleSchema.parse(body);
    const { schedule } = await import("@/lib/scheduler");
    const entry = schedule({
      ...data,
      scheduledAt: new Date(data.scheduledAt),
    });
    return NextResponse.json({ success: true, entry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to schedule post" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, action } = await req.json();
    if (!id || !action) return NextResponse.json({ error: "id and action required" }, { status: 400 });

    const { markPublished, markFailed } = await import("@/lib/scheduler");
    if (action === "published") markPublished(id);
    else if (action === "failed") markFailed(id);
    else return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}
