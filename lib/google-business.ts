const GBP_BASE = "https://mybusiness.googleapis.com/v4";
const accountId = process.env.GOOGLE_BUSINESS_ACCOUNT_ID ?? "";
const locationId = process.env.GOOGLE_BUSINESS_LOCATION_ID ?? "";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN ?? "";

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google Business API credentials are not configured");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    // Do not expose OAuth error details to callers
    throw new Error("Failed to obtain Google access token");
  }
  const data = await res.json();
  if (!data.access_token) throw new Error("No access token in Google OAuth response");
  return data.access_token;
}

export async function createGooglePost(content: string, type = "STANDARD"): Promise<unknown> {
  if (!accountId || !locationId) {
    throw new Error("Google Business account/location ID not configured");
  }

  const token = await getAccessToken();
  const res = await fetch(`${GBP_BASE}/${accountId}/${locationId}/localPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      languageCode: "ja",
      summary: content,
      topicType: type,
    }),
  });

  if (!res.ok) {
    // Log the error server-side but don't expose details to callers
    console.error("[google-business] createGooglePost failed:", res.status);
    throw new Error("Failed to create Google Business post");
  }
  return res.json();
}

export async function getGoogleReviews(): Promise<unknown[]> {
  if (!accountId || !locationId) {
    throw new Error("Google Business account/location ID not configured");
  }

  const token = await getAccessToken();
  const res = await fetch(`${GBP_BASE}/${accountId}/${locationId}/reviews`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error("[google-business] getGoogleReviews failed:", res.status);
    throw new Error("Failed to fetch Google reviews");
  }
  const data = await res.json();
  return data.reviews ?? [];
}

export async function replyToReview(reviewId: string, reply: string): Promise<void> {
  if (!accountId || !locationId) {
    throw new Error("Google Business account/location ID not configured");
  }

  const token = await getAccessToken();
  const res = await fetch(
    `${GBP_BASE}/${accountId}/${locationId}/reviews/${reviewId}/reply`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment: reply }),
    }
  );

  if (!res.ok) {
    console.error("[google-business] replyToReview failed:", res.status);
    throw new Error("Failed to reply to review");
  }
}
