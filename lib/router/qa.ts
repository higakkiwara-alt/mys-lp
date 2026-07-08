import { callAgent } from "./executor";
import { MODELS } from "./models";
import { calcCostUsd } from "./pricing";

// QA Agent: 成果物の事前レビュー（Haiku・低コスト）
// 不合格なら Orchestrator が直前の生成ステップをフィードバック付きで再実行する（最大1回）

export type QaVerdict = {
  pass: boolean;
  feedback: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export async function qaReview(input: string, output: string): Promise<QaVerdict> {
  const res = await callAgent({
    agent: "QA",
    model: MODELS.HAIKU,
    maxTokens: 1024,
    prompt: `以下の依頼に対する成果物をチェックし、JSONのみ返してください。

【依頼】
${input.slice(0, 2000)}

【成果物】
${output.slice(0, 6000)}

チェック観点:
1. 依頼の意図に応えているか
2. ブランド適合（美容室Mys: 上品・専門性・髪質改善専門）
3. 事実として怪しい断定・誇大表現がないか（景表法・薬機法リスク含む）
4. 誤字・不自然な日本語
5. 炎上・クレームリスク

JSON形式: {"pass": true/false, "feedback": "不合格の場合は具体的な修正指示。合格なら空文字"}
軽微な問題は pass:true とし feedback に改善点を書く。公開に支障があるときだけ pass:false。`,
  });

  const jsonMatch = res.output.match(/\{[\s\S]*\}/);
  let pass = true;
  let feedback = "";
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as { pass?: boolean; feedback?: string };
      pass = parsed.pass !== false;
      feedback = parsed.feedback ?? "";
    } catch {
      // JSON解析失敗は合格扱い（QAで依頼全体を止めない）
    }
  }
  return {
    pass,
    feedback,
    inputTokens: res.inputTokens,
    outputTokens: res.outputTokens,
    costUsd: calcCostUsd(res.model, res.inputTokens, res.outputTokens),
  };
}
