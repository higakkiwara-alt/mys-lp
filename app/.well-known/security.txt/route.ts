import { NextResponse } from "next/server";

// RFC 9116 — security.txt
// Allows security researchers to know how to report vulnerabilities.
export async function GET() {
  const contact = process.env.SECURITY_CONTACT_EMAIL ?? "security@example.com";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com";

  const body = [
    `Contact: mailto:${contact}`,
    `Expires: 2027-01-01T00:00:00Z`,
    `Preferred-Languages: ja, en`,
    `Policy: ${appUrl}/security-policy`,
    `Canonical: ${appUrl}/.well-known/security.txt`,
  ].join("\n");

  return new NextResponse(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
