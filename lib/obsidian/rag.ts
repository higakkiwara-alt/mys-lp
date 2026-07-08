import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { readNote, searchVaultContext, isVaultConfigured } from "./vault";

// Day90: RAG 本格導入
// Vault 全体を埋め込みインデックス化し、オーナー指定の優先順位で検索する:
//   CEO Principles → 会社方針 → 店舗ルール → 過去の判断 → Meeting → Knowledge → Prompt → Archive
// インデックス未整備・OPENAI_API_KEY 未設定時は従来の GitHub 検索にフォールバック

const EMBED_MODEL = "text-embedding-3-small";

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

/** オーナー指定の検索優先順位（パス → 重み）。スコア = コサイン類似度 × 重み */
export function tierWeightFor(path: string): number {
  if (path.includes("CEO Principles")) return 1.3; // 1. CEO Principles
  if (path.startsWith("Company OS/経営判断")) return 1.15; // 4. 過去の判断
  if (path.startsWith("Company OS/店舗運営")) return 1.2; // 3. 店舗ルール
  if (path.startsWith("Company OS")) return 1.2; // 2. 会社方針（Company OS直下・各方針）
  if (path.startsWith("Meetings")) return 1.0; // 5. Meeting
  if (path.startsWith("Knowledge")) return 0.9; // 6. Knowledge
  if (path.startsWith("Prompts")) return 0.8; // 7. Prompt
  if (path.startsWith("Archive")) return 0.5; // 8. Archive（最後）
  return 0.85; // その他（Projects / SNS / Daily Notes / Logs）
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export type RetrievedNote = { path: string; excerpt: string; score?: number };

/**
 * 文脈検索（Orchestrator から毎実行呼ばれる）
 * 1) ピン留めノートは常に読む 2) RAGインデックスで優先順位付き検索 3) 未整備なら GitHub 検索
 */
export async function retrieveContext(
  query: string,
  pinnedPaths: string[]
): Promise<{ notes: RetrievedNote[]; method: "rag" | "search" | "none" }> {
  const notes: RetrievedNote[] = [];
  const seen = new Set<string>();

  for (const path of pinnedPaths.slice(0, 3)) {
    const content = await readNote(path);
    if (content) {
      notes.push({ path, excerpt: content.slice(0, 2000) });
      seen.add(path);
    }
  }

  const ai = getOpenAI();
  if (ai) {
    try {
      const count = await prisma.vaultIndex.count();
      if (count > 0) {
        const q = await ai.embeddings.create({ model: EMBED_MODEL, input: query.slice(0, 2000) });
        const qv = q.data[0].embedding;
        const rows = await prisma.vaultIndex.findMany({
          select: { path: true, excerpt: true, embedding: true },
        });
        const scored = rows
          .filter((r) => !seen.has(r.path))
          .map((r) => ({
            path: r.path,
            excerpt: r.excerpt,
            score: cosine(qv, r.embedding as unknown as number[]) * tierWeightFor(r.path),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
        for (const s of scored) {
          if (s.score > 0.25) notes.push({ path: s.path, excerpt: s.excerpt.slice(0, 1500), score: s.score });
        }
        return { notes, method: "rag" };
      }
    } catch (e) {
      console.error("RAG retrieval failed, falling back:", e);
    }
  }

  // フォールバック: GitHub code search（Day7 実装）
  const fallback = await searchVaultContext(query, []);
  for (const n of fallback.notes) {
    if (!seen.has(n.path)) notes.push(n);
  }
  return { notes, method: fallback.notes.length ? "search" : notes.length ? "rag" : "none" };
}

// ── インデックス同期（夜間 cron / 手動）───────────────────────

type TreeItem = { path: string; type: string; sha: string };

async function listVaultFiles(): Promise<TreeItem[]> {
  const repo = process.env.OBSIDIAN_VAULT_REPO;
  const token = process.env.OBSIDIAN_VAULT_TOKEN;
  const branch = process.env.OBSIDIAN_VAULT_BRANCH ?? "main";
  if (!repo || !token) return [];
  const res = await fetch(`https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { tree?: TreeItem[] };
  return (data.tree ?? []).filter((t) => t.type === "blob" && t.path.endsWith(".md"));
}

function parseFrontmatter(content: string): { title?: string; tags: string[] } {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { tags: [] };
  const title = m[1].match(/^title:\s*(.+)$/m)?.[1]?.trim();
  const tagsRaw = m[1].match(/^tags:\s*\[(.*)\]$/m)?.[1] ?? "";
  return { title, tags: tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) };
}

/** 差分同期を remaining=0 まで繰り返す（初回インデックス用。実行予算内で可能な限り進める） */
export async function syncVaultIndexFull(budgetMs = 240_000): Promise<{
  total: number; indexed: number; updated: number; removed: number; remaining: number; rounds: number;
}> {
  const started = Date.now();
  let last = await syncVaultIndex(100);
  let rounds = 1;
  while (last.remaining > 0 && Date.now() - started < budgetMs) {
    last = await syncVaultIndex(100);
    rounds++;
  }
  return { ...last, rounds };
}

/**
 * Vault → VaultIndex の差分同期。1回の呼び出しで最大 maxFiles 件を埋め込み（実行時間対策）
 * 戻り値: 処理状況（Dashboard/レスポンス表示用）
 */
export async function syncVaultIndex(maxFiles = 100): Promise<{
  total: number;
  indexed: number;
  updated: number;
  removed: number;
  remaining: number;
}> {
  const ai = getOpenAI();
  if (!ai || !isVaultConfigured()) {
    return { total: 0, indexed: 0, updated: 0, removed: 0, remaining: 0 };
  }

  const files = await listVaultFiles();
  const existing = await prisma.vaultIndex.findMany({ select: { path: true, sha: true } });
  const existingMap = new Map(existing.map((e) => [e.path, e.sha]));

  // 削除されたノートをインデックスから除去
  const alive = new Set(files.map((f) => f.path));
  const toRemove = existing.filter((e) => !alive.has(e.path)).map((e) => e.path);
  if (toRemove.length) {
    await prisma.vaultIndex.deleteMany({ where: { path: { in: toRemove } } });
  }

  const changed = files.filter((f) => existingMap.get(f.path) !== f.sha);
  let updated = 0;

  for (const f of changed.slice(0, maxFiles)) {
    const content = await readNote(f.path);
    if (!content) continue;
    const { title, tags } = parseFrontmatter(content);
    const body = content.replace(/^---\n[\s\S]*?\n---/, "").trim();
    const excerpt = body.slice(0, 1500);
    const embedInput = `${f.path}\n${title ?? ""}\n${tags.join(" ")}\n${excerpt}`.slice(0, 8000);
    const emb = await ai.embeddings.create({ model: EMBED_MODEL, input: embedInput });
    await prisma.vaultIndex.upsert({
      where: { path: f.path },
      create: {
        path: f.path,
        folder: f.path.split("/")[0],
        title: title ?? f.path.split("/").pop()!.replace(/\.md$/, ""),
        tags,
        sha: f.sha,
        excerpt,
        embedding: emb.data[0].embedding,
      },
      update: {
        sha: f.sha,
        title: title ?? f.path.split("/").pop()!.replace(/\.md$/, ""),
        tags,
        excerpt,
        embedding: emb.data[0].embedding,
      },
    });
    updated++;
  }

  return {
    total: files.length,
    indexed: existing.length - toRemove.length + updated,
    updated,
    removed: toRemove.length,
    remaining: Math.max(0, changed.length - updated),
  };
}
