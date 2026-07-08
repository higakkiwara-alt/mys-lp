import { MODELS, type ModelId, MODEL_LABEL } from "./models";
import type { Classification } from "./classifier";
import type { RouterPolicy } from "./config";
import type { ModelDecision } from "./guard";
import { decideRoute, type Route } from "./routes";
import { estimateCostUsd, calcCostUsd } from "./pricing";

// AI COO の実行計画: 依頼 → 必要Agent選定 → 実行順序決定
// ステップ種別:
//   llm      … Agent(モデル)呼び出し
//   qa       … QA Agent による成果物レビュー（不合格なら直前ステップを再実行）
//   approval … 承認ゲート（オーナー承認まで停止）
//   publish  … n8n 投稿ワークフロー呼び出し（承認後のみ到達）

export type PlanStep = {
  name: string; // think | write | image_prompt | qa | approval | publish | search | knowledge | ...
  kind: "llm" | "qa" | "approval" | "publish";
  agent: string;
  model?: ModelId;
  useWebSearch?: boolean;
  /** llm ステップのプロンプト方針（steps.ts がこれを見てプロンプトを組む） */
  instruction?: string;
};

export type Plan = {
  steps: PlanStep[];
  approvalRequired: boolean;
  approvalReason?: string;
  estimatedUsd: number;
  decision: ModelDecision;
  route: Route;
  /** 使用するライブラリプロンプトID（実行ログで成功率を追跡） */
  promptId?: string;
};

/** 承認が必要か（オーナー指示: SNS投稿・外部送信・重要判断・高コストは必ず承認キュー） */
export function needsApprovalQueue(
  c: Classification,
  decision: ModelDecision,
  estimatedUsd: number,
  policy: RouterPolicy
): { required: boolean; reason?: string } {
  if (c.needs_approval && policy.requireApprovalForPublish)
    return { required: true, reason: "外部発信・送信を伴うため" };
  if (decision.escalated) return { required: true, reason: "重要判断（Fable 5使用）のため" };
  if (estimatedUsd > policy.approvalCostThresholdUsd)
    return { required: true, reason: `推定コスト $${estimatedUsd.toFixed(2)} が閾値超過のため` };
  return { required: false };
}

export function buildPlan(
  c: Classification,
  decision: ModelDecision,
  policy: RouterPolicy,
  source?: string
): Plan {
  const route = decideRoute(c, decision, policy);
  const steps: PlanStep[] = [];

  const isSnsAnnounce = c.needs_approval && (c.domain === "SNS" || c.intent === "create_text" || c.intent === "create_image");
  const isVoiceMemo = source === "voice" && (c.intent === "knowledge" || c.intent === "manage");

  if (isVoiceMemo) {
    // 音声→知識化WF: 文字起こし(n8n済) → 要約 → 判断 → タスク化 → Obsidian保存 → LINE報告
    steps.push(
      {
        name: "knowledge",
        kind: "llm",
        agent: "Knowledge",
        model: MODELS.SONNET,
        instruction:
          "音声メモの文字起こしを知識化する。①要約3行 ②内容の構造化（トピック別見出し）③決定事項（数字・日付を正確に）④アイデア・気づき。聞き取り不明瞭な箇所は【要確認】を付ける。",
      },
      {
        name: "tasks",
        kind: "llm",
        agent: "COO",
        model: MODELS.SONNET,
        instruction:
          "前ステップの内容からタスクを抽出する。各タスク: 内容/担当（不明なら大竹）/期限（明示がなければ提案）/優先度(高中低)。経営判断が必要な項目は「■要判断」として分離する。タスクがなければ「タスクなし」と明記。",
      }
    );
  } else if (isSnsAnnounce) {
    // SNS Agent フロー: 目的確認→投稿案→媒体別最適化→画像/動画案→QA→承認→投稿
    steps.push(
      {
        name: "think",
        kind: "llm",
        agent: "SNS",
        model: MODELS.SONNET,
        instruction:
          "この告知の目的・ターゲット・訴求ポイントを整理する。情報が不足している点は前提を明示して補い、「■オーナーへの確認事項」として列挙する（承認時に確認される）。",
      },
      {
        name: "write",
        kind: "llm",
        agent: "SNS",
        model: MODELS.SONNET,
        instruction: `前ステップの方針に基づき、媒体別に最適化した投稿文を作成する。対象媒体: ${policy.snsPlatforms.join("/")}。各媒体の文化（文字数・ハッシュタグ・トーン）に合わせる。`,
      },
      {
        name: "image_prompt",
        kind: "llm",
        agent: "SNS",
        model: MODELS.SONNET,
        instruction:
          "投稿に添える画像案（画像生成AI用プロンプト、日本語説明つき）と、必要なら15-30秒の動画案（構成・テロップ）を作成する。",
      },
      { name: "qa", kind: "qa", agent: "QA", model: MODELS.HAIKU },
      { name: "approval", kind: "approval", agent: "COO" },
      { name: "publish", kind: "publish", agent: "Automation" }
    );
  } else if (route.kind === "llm" || route.kind === "handoff") {
    steps.push({
      name: route.step,
      kind: "llm",
      agent: route.agent,
      model: route.model,
      useWebSearch: route.useWebSearch,
      instruction: route.handoffNote,
    });
    // 発信・送信を伴う場合はQA+承認を挟む（publish は SNSフロー以外は無し=手動実行）
    if (c.needs_approval) {
      steps.push(
        { name: "qa", kind: "qa", agent: "QA", model: MODELS.HAIKU },
        { name: "approval", kind: "approval", agent: "COO" }
      );
    } else if (decision.escalated) {
      // 重要判断: 判断ログを正式化する前にオーナー承認
      steps.push({ name: "approval", kind: "approval", agent: "COO" });
    }
  }

  // 見積: llm ステップ合計 + 分類コスト
  const classifyCost = calcCostUsd(MODELS.HAIKU, 1500, 300);
  let estimatedUsd = classifyCost;
  for (const s of steps) {
    if (s.kind === "llm") {
      const kind = s.model === MODELS.FABLE ? "think_deep" : s.name === "write" ? "create_text" : s.name;
      estimatedUsd += estimateCostUsd(kind, s.model ?? MODELS.SONNET);
    }
    if (s.kind === "qa") estimatedUsd += estimateCostUsd("classify", MODELS.HAIKU);
  }

  const approval = needsApprovalQueue(c, decision, estimatedUsd, policy);
  if (!approval.required) {
    // 承認不要なら approval/publish ステップを除去（publishは承認とセット）
    const filtered = steps.filter((s) => s.kind !== "approval");
    return { steps: filtered, approvalRequired: false, estimatedUsd, decision, route };
  }
  // 承認必須なのに approval ステップがない計画（高コスト等）→ 末尾に追加
  if (!steps.some((s) => s.kind === "approval")) {
    steps.push({ name: "approval", kind: "approval", agent: "COO" });
  }
  return { steps, approvalRequired: true, approvalReason: approval.reason, estimatedUsd, decision, route };
}

/** 受付即時応答（オーナー指定フォーマット: 受付完了/想定処理/使用予定AI/概算コスト/完了時通知） */
export function buildAck(c: Classification, plan: Plan): string {
  const models = [...new Set(plan.steps.filter((s) => s.model).map((s) => MODEL_LABEL[s.model!]))];
  const stepNames = plan.steps.map((s) => stepLabel(s.name)).join(" → ");
  return [
    `📥 受付完了「${c.title}」`,
    `想定処理: ${stepNames || "単発回答"}`,
    `使用予定AI: ${models.join(", ") || MODEL_LABEL[MODELS.SONNET]}`,
    `概算コスト: $${plan.estimatedUsd.toFixed(3)}`,
    plan.approvalRequired ? `⚠️ ${plan.approvalReason} 承認をお願いする段階で通知します` : null,
    `完了時に通知します`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function stepLabel(name: string): string {
  const labels: Record<string, string> = {
    tasks: "タスク化",
    think: "方針整理",
    write: "本文作成",
    image_prompt: "画像・動画案",
    qa: "品質チェック",
    approval: "オーナー承認",
    publish: "投稿",
    search: "検索",
    knowledge: "知識整理",
    create_text: "文章作成",
    create_code: "実装タスク定義",
    create_image: "画像案",
    create_video: "動画案",
    data: "データ操作",
    automation: "自動化設計",
    manage: "タスク整理",
  };
  return labels[name] ?? name;
}
