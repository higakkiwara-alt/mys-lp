import { PROMPT_LIBRARY, type LibraryPrompt } from "@/prompts/library";
import type { Classification } from "./classifier";

// プロンプトライブラリの選択（Day30: キーワードスコアリング。Day90 で埋め込み検索に置換）
// 選ばれたプロンプトは生成ステップに「様式」として注入され、promptId が実行ログに記録される

const DOMAIN_CATEGORY: Record<string, string[]> = {
  経営: ["経営判断", "不成約分析", "売却・M&A"],
  美容室: ["スタッフ対応", "クレーム対応", "不成約分析", "教育"],
  SNS: ["SNS"],
  教育: ["教育"],
  営業: ["不成約分析", "SNS"],
  採用: ["採用"],
  財務: ["経営判断", "税務/法務", "売却・M&A"],
  法務: ["税務/法務"],
  技術: ["n8n/Obsidian自動化"],
};

export function selectPrompt(c: Classification, input: string): LibraryPrompt | null {
  const text = `${input} ${c.title} ${c.tags.join(" ")}`;
  const preferredCategories = DOMAIN_CATEGORY[c.domain] ?? [];

  let best: LibraryPrompt | null = null;
  let bestScore = 0;

  for (const p of PROMPT_LIBRARY) {
    let score = 0;
    // タグ・タイトルのキーワード一致
    for (const tag of p.tags) {
      if (text.includes(tag)) score += 3;
    }
    for (const word of p.title.split(/[・\s]/)) {
      if (word.length >= 2 && text.includes(word)) score += 2;
    }
    // ドメイン→カテゴリの適合
    if (preferredCategories.includes(p.category)) score += 2;
    // intent の相性
    if (c.intent === "automation" && p.category === "n8n/Obsidian自動化") score += 3;
    if (c.intent === "knowledge" && p.id === "auto-obsidian-note") score += 3;

    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  // 適合度が低すぎる場合は使わない（誤った様式の強制を避ける）
  return bestScore >= 4 ? best : null;
}
