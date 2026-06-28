const LINE_API = "https://api.line.me/v2/bot";

function headers() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function broadcastMessage(messages: LineMessage[]): Promise<void> {
  const res = await fetch(`${LINE_API}/message/broadcast`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LINE broadcast failed: ${err}`);
  }
}

export async function pushMessage(to: string, messages: LineMessage[]): Promise<void> {
  const res = await fetch(`${LINE_API}/message/push`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ to, messages }),
  });
  if (!res.ok) throw new Error("LINE push failed");
}

export async function getFollowerCount(): Promise<number> {
  const res = await fetch(`${LINE_API}/insight/followers?date=${formatDate(new Date())}`, {
    headers: headers(),
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.followers ?? 0;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

export type LineMessage =
  | { type: "text"; text: string }
  | { type: "image"; originalContentUrl: string; previewImageUrl: string }
  | {
      type: "flex";
      altText: string;
      contents: Record<string, unknown>;
    };

export function buildTextMessage(text: string): LineMessage {
  return { type: "text", text };
}

export function buildRichMessage(title: string, body: string, url: string): LineMessage {
  return {
    type: "flex",
    altText: title,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "Mys サロン", size: "xs", color: "#B8975A" },
          { type: "text", text: title, size: "md", weight: "bold", wrap: true },
        ],
        backgroundColor: "#1A1A1A",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [{ type: "text", text: body, wrap: true, size: "sm" }],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: { type: "uri", label: "詳細を見る", uri: url },
            style: "primary",
            color: "#B8975A",
          },
        ],
      },
    },
  };
}
