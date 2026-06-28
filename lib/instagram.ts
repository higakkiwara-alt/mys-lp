const IG_API = "https://graph.instagram.com/v21.0";

function getToken(): string {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new Error("INSTAGRAM_ACCESS_TOKEN is not set");
  return token;
}

function getAccountId(): string {
  const id = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!id) throw new Error("INSTAGRAM_BUSINESS_ACCOUNT_ID is not set");
  return id;
}

export async function getRecentPosts(limit = 10): Promise<InstagramPost[]> {
  const token = getToken();
  const id = getAccountId();
  const fields = "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count";
  const res = await fetch(
    `${IG_API}/${id}/media?fields=${fields}&limit=${limit}&access_token=${token}`
  );
  if (!res.ok) throw new Error("Failed to fetch Instagram posts");
  const data = await res.json();
  return data.data ?? [];
}

export async function getInsights(mediaId: string): Promise<Record<string, number>> {
  const token = getToken();
  const metrics = "reach,impressions,engagement,saved";
  const res = await fetch(
    `${IG_API}/${mediaId}/insights?metric=${metrics}&access_token=${token}`
  );
  if (!res.ok) return {};
  const data = await res.json();
  return Object.fromEntries(
    (data.data ?? []).map((m: { name: string; values: Array<{ value: number }> }) => [m.name, m.values[0]?.value ?? 0])
  );
}

export async function createMediaContainer(
  imageUrl: string,
  caption: string
): Promise<string> {
  const token = getToken();
  const id = getAccountId();
  const res = await fetch(`${IG_API}/${id}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: token,
    }),
  });
  if (!res.ok) throw new Error("Failed to create media container");
  const data = await res.json();
  return data.id;
}

export async function publishMedia(containerId: string): Promise<string> {
  const token = getToken();
  const id = getAccountId();
  const res = await fetch(`${IG_API}/${id}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: token }),
  });
  if (!res.ok) throw new Error("Failed to publish to Instagram");
  const data = await res.json();
  return data.id;
}

export type InstagramPost = {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
};
