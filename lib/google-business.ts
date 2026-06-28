const GBP_BASE = "https://mybusiness.googleapis.com/v4";
const accountId = process.env.GOOGLE_BUSINESS_ACCOUNT_ID ?? "";
const locationId = process.env.GOOGLE_BUSINESS_LOCATION_ID ?? "";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN ?? "";

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

  if (!res.ok) throw new Error("Failed to refresh Google access token");
  const data = await res.json();
  return data.access_token;
}

export async function createGooglePost(content: string, type: string = "STANDARD"): Promise<unknown> {
  const token = await getAccessToken();
  const res = await fetch(
    `${GBP_BASE}/${accountId}/${locationId}/localPosts`,
    {
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
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Business API error: ${err}`);
  }
  return res.json();
}

export async function getGoogleReviews(): Promise<unknown[]> {
  const token = await getAccessToken();
  const res = await fetch(
    `${GBP_BASE}/${accountId}/${locationId}/reviews`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) throw new Error("Failed to fetch Google reviews");
  const data = await res.json();
  return data.reviews ?? [];
}

export async function replyToReview(reviewId: string, reply: string): Promise<void> {
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
  if (!res.ok) throw new Error("Failed to reply to review");
}
