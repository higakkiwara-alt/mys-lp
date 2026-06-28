import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const { getGoogleReviews } = await import("@/lib/google-business");
    const reviews = await getGoogleReviews();
    return NextResponse.json({ reviews });
  } catch {
    return NextResponse.json({ error: "Google Business API not configured" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { reviewId, reply } = await req.json();
    if (!reviewId || !reply) {
      return NextResponse.json({ error: "reviewId and reply are required" }, { status: 400 });
    }

    const { replyToReview } = await import("@/lib/google-business");
    await replyToReview(reviewId, reply);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[meo/reviews]", error);
    return NextResponse.json({ error: "Failed to post reply" }, { status: 500 });
  }
}
