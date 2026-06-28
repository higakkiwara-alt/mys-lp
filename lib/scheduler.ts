export type ScheduledPost = {
  id: string;
  content: string;
  platform: string;
  scheduledAt: Date;
  status: "pending" | "published" | "failed";
  postId?: string;
};

const QUEUE: ScheduledPost[] = [];

export function schedule(post: Omit<ScheduledPost, "id" | "status">): ScheduledPost {
  const entry: ScheduledPost = {
    ...post,
    id: `sched_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    status: "pending",
  };
  QUEUE.push(entry);
  return entry;
}

export function getPending(): ScheduledPost[] {
  const now = new Date();
  return QUEUE.filter((p) => p.status === "pending" && p.scheduledAt <= now);
}

export function getAll(): ScheduledPost[] {
  return [...QUEUE].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
}

export function markPublished(id: string, postId?: string): void {
  const entry = QUEUE.find((p) => p.id === id);
  if (entry) {
    entry.status = "published";
    if (postId) entry.postId = postId;
  }
}

export function markFailed(id: string): void {
  const entry = QUEUE.find((p) => p.id === id);
  if (entry) entry.status = "failed";
}

export function getBestPostTimes(): Array<{ day: string; hour: number; score: number }> {
  return [
    { day: "月", hour: 8, score: 92 },
    { day: "火", hour: 12, score: 88 },
    { day: "水", hour: 19, score: 95 },
    { day: "木", hour: 8, score: 85 },
    { day: "金", hour: 18, score: 97 },
    { day: "土", hour: 10, score: 91 },
    { day: "日", hour: 11, score: 89 },
  ];
}
