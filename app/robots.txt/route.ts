import { NextResponse } from "next/server";

// Block crawlers from indexing admin, API, and auth routes.
// Public-facing pages remain indexable.
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com";

  const body = [
    "User-agent: *",
    "Disallow: /dashboard/",
    "Disallow: /ai-os/",
    "Disallow: /api/",
    "Disallow: /login",
    "",
    `Sitemap: ${appUrl}/sitemap.xml`,
  ].join("\n");

  return new NextResponse(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
