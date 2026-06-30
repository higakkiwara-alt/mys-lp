import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthFromRequest } from "@/lib/auth";

const ALLOWED_PLATFORMS = ["instagram", "google", "line", "wordpress", "tiktok", "youtube", "x", "note"] as const;

const scheduleSchema = z.object({
  content: z.string().min(1).max(5000),
  platform: z.enum(ALLOWED_PLATFORMS),
  scheduledAt: z.string().datetime(),
  imageUrl: z.string().url().max(2048).optional(),
});

const putSchema = z.object({
  id: z.string().min(1).max(100),
  action: z.enum(["published", "failed"]),
});

export async function GET(req: NextRequest) {
  const authErr = requireAuthFromRequest(req);
  if (authErr) return authErr;

  const { getAll } = await import("@/lib/scheduler");
  return NextResponse.json({ posts: getAll() });
}

export async function POST(req: NextRequest) {
  const authErr = requireAuthFromRequest(req);
  if (authErr) return authErr;

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
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to schedule post" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authErr = requireAuthFromRequest(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { id, action } = putSchema.parse(body);

    const { markPublished, markFailed } = await import("@/lib/scheduler");
    if (action === "published") markPublished(id);
    else markFailed(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}
