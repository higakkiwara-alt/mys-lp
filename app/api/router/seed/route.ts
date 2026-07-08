import { NextResponse } from "next/server";
import { putVaultFile, readNote, isVaultConfigured } from "@/lib/obsidian/vault";
import { verifyRouterSecret } from "@/lib/router/notify";
import { PROMPT_LIBRARY } from "@/prompts/library";
import { CEO_PRINCIPLES_MD, CEO_PRINCIPLES_PATH } from "@/prompts/ceo-principles";

export const maxDuration = 300;

// Vault 初期シード（デプロイ後に1回実行）:
//   curl -X POST https://<app>/api/router/seed -H "X-ROUTER-SECRET: ..."
// - CEO Principles（ピン留めノート）を Company OS/ に作成
// - プロンプトライブラリ30本を Prompts/<カテゴリ>/ に書き出し
// 既存ファイルは上書きしない（force: true で上書き）
export async function POST(req: Request) {
  if (!verifyRouterSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isVaultConfigured()) {
    return NextResponse.json(
      { error: "OBSIDIAN_VAULT_REPO / OBSIDIAN_VAULT_TOKEN が未設定です" },
      { status: 400 }
    );
  }
  const body = (await req.json().catch(() => ({}))) as { force?: boolean };
  const force = body.force === true;

  const results: Array<{ path: string; result: "created" | "skipped" | "failed" }> = [];

  const writeIfAbsent = async (path: string, content: string, message: string) => {
    if (!force && (await readNote(path)) !== null) {
      results.push({ path, result: "skipped" });
      return;
    }
    const ok = await putVaultFile(path, content, message);
    results.push({ path, result: ok ? "created" : "failed" });
  };

  // 1) CEO Principles（ピン留めノート）
  await writeIfAbsent(CEO_PRINCIPLES_PATH, CEO_PRINCIPLES_MD, "AI Router: CEO Principles v1");

  // 2) プロンプトライブラリ30本
  for (const p of PROMPT_LIBRARY) {
    const path = `Prompts/${p.category.replace(/\//g, "・")}/${p.title}.md`;
    const md = [
      "---",
      `id: ${p.id}`,
      `category: ${p.category}`,
      `title: ${p.title}`,
      `tags: [${p.tags.join(", ")}]`,
      "version: 1",
      "---",
      "",
      p.body,
      "",
    ].join("\n");
    await writeIfAbsent(path, md, `AI Router: プロンプト ${p.title}`);
  }

  const summary = {
    created: results.filter((r) => r.result === "created").length,
    skipped: results.filter((r) => r.result === "skipped").length,
    failed: results.filter((r) => r.result === "failed").length,
  };
  return NextResponse.json({ summary, results });
}
