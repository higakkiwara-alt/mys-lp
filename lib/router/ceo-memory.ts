import { prisma } from "@/lib/db";
import { callAgent } from "./executor";
import { MODELS } from "./models";
import { calcCostUsd } from "./pricing";
import { readNote, putVaultFile } from "@/lib/obsidian/vault";
import type { Classification } from "./classifier";

// CEO Memory（Day90 優先順位⑥）
// 経営・財務の判断を「背景 / 選択肢 / 決定 / なぜ / 何を優先したか」で構造化して蓄積し、
// 後日「結果 <runId> ...」で結果を記録する。
// 将来、AI COO が「過去の大竹ならどう判断したか」を根拠付きで説明するための資産。

export async function recordCeoMemory(
  runId: string,
  c: Classification,
  output: string,
  obsidianPath: string | null
): Promise<boolean> {
  try {
    const res = await callAgent({
      agent: "Knowledge",
      model: MODELS.HAIKU,
      maxTokens: 1200,
      prompt: `以下の経営判断の内容から、判断記録をJSONで抽出してください。JSONのみ返す。

【判断タイトル】${c.title}
【内容】
${output.slice(0, 8000)}

JSON形式:
{"background":"背景（何が起きていたか）","options":"検討した選択肢（簡潔に列挙）","decision":"決定・推奨された内容","reason":"なぜその判断か（根拠）","priorities":"何を優先したか（何を犠牲にしたかも）"}`,
    });
    const m = res.output.match(/\{[\s\S]*\}/);
    if (!m) return false;
    const data = JSON.parse(m[0]) as {
      background?: string;
      options?: string;
      decision?: string;
      reason?: string;
      priorities?: string;
    };
    await prisma.ceoMemory.upsert({
      where: { runId },
      create: {
        runId,
        title: c.title,
        background: data.background ?? "",
        options: data.options ?? "",
        decision: data.decision ?? "",
        reason: data.reason ?? "",
        priorities: data.priorities ?? "",
        tags: c.tags,
        obsidianPath,
      },
      update: {
        decision: data.decision ?? "",
        reason: data.reason ?? "",
        priorities: data.priorities ?? "",
      },
    });
    // 抽出コストも実行に計上
    await prisma.routerRun.update({
      where: { id: runId },
      data: { costUsd: { increment: calcCostUsd(res.model, res.inputTokens, res.outputTokens) } },
    });
    return true;
  } catch (e) {
    console.error("CEO Memory record failed:", e);
    return false;
  }
}

/** 類似判断の取得（タグ一致順）。CEO への依頼時に「過去の大竹の判断」として文脈注入する */
export async function getRelatedMemories(tags: string[], limit = 3): Promise<string> {
  const memories = await prisma.ceoMemory.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  if (!memories.length) return "";
  const scored = memories
    .map((m) => ({ m, score: m.tags.filter((t) => tags.includes(t)).length }))
    .sort((a, b) => b.score - a.score || b.m.createdAt.getTime() - a.m.createdAt.getTime())
    .slice(0, limit);
  return scored
    .map(({ m }) =>
      [
        `● ${m.title}（${m.createdAt.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" })}）`,
        `  決定: ${m.decision}`,
        `  理由: ${m.reason}`,
        `  優先: ${m.priorities}`,
        m.outcome ? `  結果: ${m.outcome}` : `  結果: 未記録`,
      ].join("\n")
    )
    .join("\n");
}

/** 「結果 <runId> ...」コマンド: 判断の結果を Memory と Obsidian ノートの両方に記録 */
export async function recordOutcome(runId: string, outcome: string): Promise<string> {
  const memory = await prisma.ceoMemory.findUnique({ where: { runId } });
  if (!memory) {
    return "この実行の CEO Memory が見つかりません（経営・財務の判断のみ記録対象です）";
  }
  await prisma.ceoMemory.update({
    where: { runId },
    data: { outcome, outcomeAt: new Date() },
  });
  // Obsidian ノートにも結果を追記
  if (memory.obsidianPath) {
    const existing = await readNote(memory.obsidianPath);
    if (existing) {
      const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
      await putVaultFile(
        memory.obsidianPath,
        `${existing.trimEnd()}\n\n## 結果（${date} 記録）\n\n${outcome}\n`,
        `CEO Memory: 結果記録 ${memory.title}`
      );
    }
  }
  return `🧠 判断「${memory.title}」の結果を記録しました。今後の類似判断で参照されます。`;
}
