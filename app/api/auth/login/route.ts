import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, makeSessionCookie, verifyAdminPassword } from "@/lib/auth";

const schema = z.object({
  password: z.string().min(1).max(256),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = schema.parse(body);

    if (!verifyAdminPassword(password)) {
      // Constant delay to prevent timing attacks / user enumeration
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = createSessionToken();
    const cookieHeader = makeSessionCookie(token);

    const redirect = req.nextUrl.searchParams.get("redirect") ?? "/dashboard";
    // Validate redirect path to prevent open redirect
    const safePath = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard";

    return NextResponse.json(
      { success: true, redirect: safePath },
      { headers: { "Set-Cookie": cookieHeader } }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
