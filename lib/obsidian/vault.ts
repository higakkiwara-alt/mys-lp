// Obsidian Vault（GitHubリポジトリ・Git同期済み）との連携
// オーナー方針: Company OS を正本（Source of Truth）とし、AIは必ず参照してから判断する
//
// 環境変数:
//   OBSIDIAN_VAULT_REPO   例: "owner/companyos-vault"
//   OBSIDIAN_VAULT_TOKEN  GitHub PAT (contents: read/write)
//   OBSIDIAN_VAULT_BRANCH 省略時 "main"
// 未設定でも Router は動作する（保存・参照をスキップし、その旨を記録）

const API = "https://api.github.com";

type VaultNote = { path: string; excerpt: string };

function config() {
  const repo = process.env.OBSIDIAN_VAULT_REPO;
  const token = process.env.OBSIDIAN_VAULT_TOKEN;
  const branch = process.env.OBSIDIAN_VAULT_BRANCH ?? "main";
  if (!repo || !token) return null;
  return { repo, token, branch };
}

export function isVaultConfigured(): boolean {
  return config() !== null;
}

async function gh(cfg: NonNullable<ReturnType<typeof config>>, path: string, init?: RequestInit) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });
}

// 優先参照フォルダ（オーナー指示: 過去の考え・会社方針・店舗ルール・過去プロンプト・売却構想を優先）
const PRIORITY_FOLDERS = ["Company OS", "Prompts"];

async function searchOnce(
  cfg: NonNullable<ReturnType<typeof config>>,
  query: string,
  pathQualifier: string | null,
  perPage: number
): Promise<string[]> {
  try {
    const qualifier = pathQualifier ? ` path:"${pathQualifier}"` : "";
    const q = encodeURIComponent(`${query} repo:${cfg.repo} extension:md${qualifier}`);
    const res = await gh(cfg, `/search/code?q=${q}&per_page=${perPage}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: Array<{ path: string }> };
    return (data.items ?? []).map((i) => i.path);
  } catch {
    return [];
  }
}

/**
 * 関連ノート検索（Day7: 優先フォルダ→全体の2段階 + ピン留めノート。Day90 で埋め込みベクトル検索に置換）
 * ピン留めノート（会社方針など常時参照すべきノート）は pinnedPaths で渡す
 */
export async function searchVaultContext(
  query: string,
  pinnedPaths: string[] = []
): Promise<{ notes: VaultNote[] }> {
  const cfg = config();
  if (!cfg) return { notes: [] };
  try {
    const notes: VaultNote[] = [];
    const seen = new Set<string>();

    // 0) ピン留めノート（会社方針・価値観など）は常に読む
    for (const path of pinnedPaths.slice(0, 3)) {
      const content = await readNote(path);
      if (content) {
        notes.push({ path, excerpt: content.slice(0, 2000) });
        seen.add(path);
      }
    }

    // 1) 優先フォルダ（Company OS / Prompts）→ 2) Vault全体
    const paths: string[] = [];
    for (const folder of PRIORITY_FOLDERS) {
      paths.push(...(await searchOnce(cfg, query, folder, 2)));
    }
    paths.push(...(await searchOnce(cfg, query, null, 3)));

    for (const path of paths) {
      if (seen.has(path) || notes.length >= 5) continue;
      const content = await readNote(path);
      if (content) {
        notes.push({ path, excerpt: content.slice(0, 1500) });
        seen.add(path);
      }
    }
    return { notes };
  } catch {
    return { notes: [] }; // 参照失敗で依頼全体を止めない
  }
}

export async function readNote(path: string): Promise<string | null> {
  const cfg = config();
  if (!cfg) return null;
  const res = await gh(
    cfg,
    `/repos/${cfg.repo}/contents/${encodeURI(path)}?ref=${cfg.branch}`
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: string; encoding?: string };
  if (!data.content) return null;
  return Buffer.from(data.content, "base64").toString("utf-8");
}

async function getSha(cfg: NonNullable<ReturnType<typeof config>>, path: string): Promise<string | null> {
  const res = await gh(cfg, `/repos/${cfg.repo}/contents/${encodeURI(path)}?ref=${cfg.branch}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { sha?: string };
  return data.sha ?? null;
}

/** Vault へのファイル書き込み（シードスクリプト・save ステップで使用） */
export async function putVaultFile(path: string, content: string, message: string): Promise<boolean> {
  return putFile(path, content, message);
}

async function putFile(path: string, content: string, message: string): Promise<boolean> {
  const cfg = config();
  if (!cfg) return false;
  const sha = await getSha(cfg, path);
  const res = await gh(cfg, `/repos/${cfg.repo}/contents/${encodeURI(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      branch: cfg.branch,
      content: Buffer.from(content, "utf-8").toString("base64"),
      ...(sha ? { sha } : {}),
    }),
  });
  return res.ok;
}

// 分類 → 保存先フォルダ（オーナー指定の仮マッピング、11-approved-decisions.md / Day7指示）
export function vaultFolderFor(intent: string, domain: string, tags: string[] = []): string {
  const t = tags.join(" ");
  if (/売却|M&A|Exit/i.test(t)) return "Company OS/売却・M&A";
  if (/会議|ミーティング|打ち合わせ/.test(t)) return "Meetings";
  if (domain === "経営" || domain === "財務") return "Company OS/経営判断";
  if (domain === "美容室") return "Company OS/店舗運営";
  if (domain === "採用" || domain === "教育") return "Company OS/採用・教育";
  if (domain === "技術" || intent === "automation" || intent === "create_code")
    return "Company OS/AI・自動化";
  if (domain === "SNS" || intent === "create_image" || intent === "create_video") return "SNS";
  if (intent === "manage") return "Projects";
  if (intent === "knowledge") return "Knowledge";
  return "Knowledge";
}

function today(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }); // YYYY-MM-DD
}

function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|#^[\]]/g, "").trim().slice(0, 60) || "untitled";
}

export type SaveNoteInput = {
  title: string;
  body: string;
  intent: string;
  domain: string;
  tags: string[];
  runId: string;
  agent: string;
  model: string;
  costUsd: number;
  vaultRefs: string[];
  /** 承認済み/下書き等の状態（frontmatterに記録） */
  noteStatus?: string;
};

/** 成果物を Vault に保存し、Daily Note に追記。戻り値は保存パス（未設定/失敗は null） */
export async function saveNoteToVault(n: SaveNoteInput): Promise<string | null> {
  if (!isVaultConfigured()) return null;

  const date = today();
  const folder = vaultFolderFor(n.intent, n.domain, n.tags);
  const path = `${folder}/${date} ${sanitize(n.title)}.md`;

  const frontmatter = [
    "---",
    `type: ${n.intent === "think" && (n.domain === "経営" || n.domain === "財務") ? "decision" : n.intent}`,
    `title: ${n.title}`,
    `date: ${date}`,
    `tags: [${n.tags.join(", ")}]`,
    `status: ${n.noteStatus ?? "final"}`,
    `source: router-run:${n.runId}`,
    `agent: ${n.agent}`,
    `model: ${n.model}`,
    `cost_usd: ${n.costUsd.toFixed(4)}`,
    "---",
  ].join("\n");

  const related = n.vaultRefs.length
    ? `\n\n## 関連ノート\n${n.vaultRefs.map((r) => `- [[${r.replace(/\.md$/, "")}]]`).join("\n")}`
    : "";

  const content = `${frontmatter}\n\n${n.body}${related}\n\n- [[Daily Notes/${date}]]\n`;
  const ok = await putFile(path, content, `AI Router: ${n.title}`);
  if (!ok) return null;

  // Daily Note に1行追記（双方向リンク）
  const dailyPath = `Daily Notes/${date}.md`;
  const existing = (await readNote(dailyPath)) ?? `---\ntype: daily\ndate: ${date}\n---\n\n# ${date}\n\n## AI Router 実行ログ\n`;
  const line = `- ${new Date().toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" })} [[${path.replace(/\.md$/, "")}|${n.title}]] (${n.agent}/${n.model}, $${n.costUsd.toFixed(3)})`;
  await putFile(dailyPath, `${existing.trimEnd()}\n${line}\n`, `Daily Note: ${n.title}`);

  return path;
}
