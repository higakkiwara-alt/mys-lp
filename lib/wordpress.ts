function getConfig() {
  const url = process.env.WORDPRESS_URL;
  const username = process.env.WORDPRESS_USERNAME;
  const password = process.env.WORDPRESS_APP_PASSWORD;
  if (!url || !username || !password) throw new Error("WordPress credentials not configured");
  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  return { url, auth };
}

export async function createDraftPost(opts: {
  title: string;
  content: string;
  excerpt?: string;
  tags?: string[];
  categories?: number[];
}): Promise<{ id: number; link: string }> {
  const { url, auth } = getConfig();
  const res = await fetch(`${url}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: opts.title,
      content: opts.content,
      excerpt: opts.excerpt ?? "",
      status: "draft",
      categories: opts.categories ?? [],
    }),
  });
  if (!res.ok) throw new Error("Failed to create WordPress post");
  const data = await res.json();
  return { id: data.id, link: data.link };
}

export async function publishPost(postId: number): Promise<void> {
  const { url, auth } = getConfig();
  const res = await fetch(`${url}/wp-json/wp/v2/posts/${postId}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "publish" }),
  });
  if (!res.ok) throw new Error("Failed to publish WordPress post");
}

export async function getRecentPosts(perPage = 10): Promise<WpPost[]> {
  const { url, auth } = getConfig();
  const res = await fetch(`${url}/wp-json/wp/v2/posts?per_page=${perPage}&status=publish`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export type WpPost = {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  link: string;
  date: string;
  status: string;
};
