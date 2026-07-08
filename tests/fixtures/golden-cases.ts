import type { Classification } from "@/lib/router/classifier";

// ゴールデンケース20件（オーナー指定カテゴリ + 主要ユースケース）
// - classification: 分類器の期待出力（回帰テストの基準値。実ログ蓄積後に実測値で更新する）
// - expect: ルーティング・承認・保存先の期待値
// live テスト（ANTHROPIC_API_KEY があるときのみ）では input を実際に分類して
// intent / domain / complexity帯 を検証する

export type GoldenCase = {
  id: string;
  label: string;
  input: string;
  classification: Classification;
  expect: {
    modelTier: "fable" | "sonnet" | "haiku";
    agent?: string;
    approvalRequired: boolean;
    folder: string;
    hasPublishStep?: boolean;
  };
};

export const GOLDEN_CASES: GoldenCase[] = [
  {
    id: "gc01-staff",
    label: "美容室のスタッフ対応",
    input: "新人アシスタントが遅刻を繰り返している。どう指導すべきか整理して",
    classification: {
      intent: "think", domain: "美容室", output_type: "回答", complexity: 3,
      urgency: "today", needs_approval: false, fable_worthiness: "",
      title: "新人アシスタントの遅刻指導方針", tags: ["店舗運営", "スタッフ"],
    },
    expect: { modelTier: "sonnet", approvalRequired: false, folder: "Company OS/店舗運営" },
  },
  {
    id: "gc02-lost-deal",
    label: "不成約分析",
    input: "先月のカウンセリングで髪質改善コースの成約率が落ちた。原因を分析して打ち手を出して",
    classification: {
      intent: "think", domain: "経営", output_type: "文書", complexity: 4,
      urgency: "this_week", needs_approval: false,
      fable_worthiness: "売上に直結する成約率低下の原因分析と打ち手決定のため",
      title: "髪質改善コース不成約分析", tags: ["経営", "成約率", "分析"],
    },
    // Day90④: 不成約分析は専用 SalesAnalyst Agent + Company OS/営業分析 に蓄積（オーナー指示で更新）
    expect: { modelTier: "fable", agent: "SalesAnalyst", approvalRequired: true, folder: "Company OS/営業分析" },
  },
  {
    id: "gc03-sns-announce",
    label: "SNS告知",
    input: "夏の紫外線ケアメニューを告知して",
    classification: {
      intent: "create_text", domain: "SNS", output_type: "文書", complexity: 2,
      urgency: "today", needs_approval: true, fable_worthiness: "",
      title: "夏の紫外線ケアメニュー告知", tags: ["SNS", "告知", "美容室"],
    },
    expect: { modelTier: "sonnet", agent: "SNS", approvalRequired: true, folder: "SNS", hasPublishStep: true },
  },
  {
    id: "gc04-recruit",
    label: "求人投稿",
    input: "スタイリストの求人原稿を書いてIndeedに出したい",
    classification: {
      intent: "create_text", domain: "採用", output_type: "文書", complexity: 2,
      urgency: "this_week", needs_approval: true, fable_worthiness: "",
      title: "スタイリスト求人原稿", tags: ["採用", "求人"],
    },
    expect: { modelTier: "sonnet", approvalRequired: true, folder: "Company OS/採用・教育", hasPublishStep: true },
  },
  {
    id: "gc05-keiei",
    label: "経営判断",
    input: "2号店を立川北口に出すべきか。資金と人材の面から判断したい",
    classification: {
      intent: "think", domain: "経営", output_type: "回答", complexity: 5,
      urgency: "this_week", needs_approval: false,
      fable_worthiness: "出店は資金・雇用・ブランドに長期影響する経営判断のため",
      title: "2号店出店判断", tags: ["経営", "出店", "投資"],
    },
    expect: { modelTier: "fable", agent: "CEO", approvalRequired: true, folder: "Company OS/経営判断" },
  },
  {
    id: "gc06-claim",
    label: "クレーム対応",
    input: "縮毛矯正の仕上がりにご不満のお客様からLINEでクレームが来た。返信文を作って",
    classification: {
      intent: "create_text", domain: "美容室", output_type: "文書", complexity: 3,
      urgency: "now", needs_approval: true, fable_worthiness: "",
      title: "縮毛矯正クレーム返信", tags: ["店舗運営", "クレーム", "顧客対応"],
    },
    expect: { modelTier: "sonnet", approvalRequired: true, folder: "Company OS/店舗運営" },
  },
  {
    id: "gc07-baikyaku",
    label: "売却判断",
    input: "会社売却に向けて、今年やるべき企業価値向上の施策を整理して優先順位をつけて",
    classification: {
      intent: "think", domain: "経営", output_type: "文書", complexity: 5,
      urgency: "this_week", needs_approval: false,
      fable_worthiness: "会社売却という最重要の経営判断に関わる戦略整理のため",
      title: "売却に向けた企業価値向上施策", tags: ["売却", "M&A", "経営"],
    },
    expect: { modelTier: "fable", agent: "CEO", approvalRequired: true, folder: "Company OS/売却・M&A" },
  },
  {
    id: "gc08-n8n",
    label: "n8n自動化",
    input: "毎朝ホットペッパーの予約数を集計してLINEに送る仕組みを自動化して",
    classification: {
      intent: "automation", domain: "技術", output_type: "ワークフロー", complexity: 3,
      urgency: "this_week", needs_approval: false, fable_worthiness: "",
      title: "予約数の朝次集計自動化", tags: ["自動化", "n8n", "予約"],
    },
    expect: { modelTier: "sonnet", agent: "Automation", approvalRequired: false, folder: "Company OS/AI・自動化" },
  },
  {
    id: "gc09-obsidian",
    label: "Obsidian保存",
    input: "今日学んだ酸性ストレートの薬剤知識をまとめてナレッジに保存して",
    classification: {
      intent: "knowledge", domain: "美容室", output_type: "Obsidianノート", complexity: 2,
      urgency: "today", needs_approval: false, fable_worthiness: "",
      title: "酸性ストレート薬剤知識", tags: ["ナレッジ", "技術", "薬剤"],
    },
    expect: { modelTier: "sonnet", agent: "Knowledge", approvalRequired: false, folder: "Company OS/店舗運営" },
  },
  {
    id: "gc10-voice-memo",
    label: "LINE音声入力（会議メモ）",
    input: "（音声文字起こし）今日のミーティングの内容。来月から朝礼を15分に短縮、新メニューの価格は22000円で決定、ゆかりさんに撮影担当をお願いする",
    classification: {
      intent: "knowledge", domain: "美容室", output_type: "Obsidianノート", complexity: 2,
      urgency: "today", needs_approval: false, fable_worthiness: "",
      title: "店舗ミーティング議事メモ", tags: ["会議", "店舗運営"],
    },
    expect: { modelTier: "sonnet", agent: "Knowledge", approvalRequired: false, folder: "Meetings" },
  },
  {
    id: "gc11-search",
    label: "検索・最新情報",
    input: "2026年の美容室業界のトレンドと髪質改善市場の動向を調べて",
    classification: {
      intent: "search", domain: "経営", output_type: "文書", complexity: 3,
      urgency: "this_week", needs_approval: false, fable_worthiness: "",
      title: "美容業界トレンド調査2026", tags: ["調査", "市場動向"],
    },
    expect: { modelTier: "sonnet", agent: "COO", approvalRequired: false, folder: "Company OS/経営判断" },
  },
  {
    id: "gc12-image",
    label: "画像生成",
    input: "髪質改善ビフォーアフターの投稿用画像のイメージを作って",
    classification: {
      intent: "create_image", domain: "SNS", output_type: "画像", complexity: 2,
      urgency: "today", needs_approval: true, fable_worthiness: "",
      title: "ビフォーアフター投稿画像", tags: ["SNS", "画像"],
    },
    expect: { modelTier: "sonnet", approvalRequired: true, folder: "SNS", hasPublishStep: true },
  },
  {
    id: "gc13-video",
    label: "動画台本",
    input: "TikTok用に酸熱トリートメントの30秒動画の台本を作って",
    classification: {
      intent: "create_video", domain: "SNS", output_type: "動画", complexity: 2,
      urgency: "this_week", needs_approval: false, fable_worthiness: "",
      title: "酸熱トリートメントTikTok台本", tags: ["SNS", "TikTok", "動画"],
    },
    expect: { modelTier: "sonnet", agent: "Video", approvalRequired: false, folder: "SNS" },
  },
  {
    id: "gc14-code",
    label: "コード生成（Claude Code へ handoff）",
    input: "ダッシュボードに今月のAIコストを表示するカードを追加実装して",
    classification: {
      intent: "create_code", domain: "技術", output_type: "コード", complexity: 3,
      urgency: "this_week", needs_approval: false, fable_worthiness: "",
      title: "コストカード実装タスク", tags: ["技術", "実装", "Dashboard"],
    },
    expect: { modelTier: "sonnet", agent: "CTO", approvalRequired: false, folder: "Company OS/AI・自動化" },
  },
  {
    id: "gc15-sheets",
    label: "スプレッドシート",
    input: "スタッフ別の指名売上を月次でまとめるスプレッドシートの構成を作って",
    classification: {
      intent: "data", domain: "経営", output_type: "スプレッドシート", complexity: 2,
      urgency: "this_week", needs_approval: false, fable_worthiness: "",
      title: "指名売上月次シート設計", tags: ["データ", "売上管理"],
    },
    expect: { modelTier: "sonnet", agent: "Sheets/Notion", approvalRequired: false, folder: "Company OS/経営判断" },
  },
  {
    id: "gc16-education",
    label: "教育教材",
    input: "アシスタント向けのシャンプー研修教材を作って",
    classification: {
      intent: "create_text", domain: "教育", output_type: "文書", complexity: 3,
      urgency: "this_week", needs_approval: false, fable_worthiness: "",
      title: "シャンプー研修教材", tags: ["教育", "研修"],
    },
    expect: { modelTier: "sonnet", agent: "Education", approvalRequired: false, folder: "Company OS/採用・教育" },
  },
  {
    id: "gc17-sales",
    label: "営業提案（AIコンサル事業）",
    input: "他店向けにAI集客支援サービスを提案する資料の構成を作って",
    classification: {
      intent: "create_text", domain: "営業", output_type: "文書", complexity: 3,
      urgency: "this_week", needs_approval: false, fable_worthiness: "",
      title: "AI集客支援の提案資料構成", tags: ["営業", "AIコンサル"],
    },
    expect: { modelTier: "sonnet", approvalRequired: false, folder: "Knowledge" },
  },
  {
    id: "gc18-tax",
    label: "税務質問",
    input: "セミナー講師の謝礼は源泉徴収が必要か、税理士に聞く前に論点を整理して",
    classification: {
      intent: "think", domain: "財務", output_type: "回答", complexity: 3,
      urgency: "this_week", needs_approval: false, fable_worthiness: "",
      title: "講師謝礼の源泉徴収論点", tags: ["税務", "財務"],
    },
    expect: { modelTier: "sonnet", agent: "CEO", approvalRequired: false, folder: "Company OS/経営判断" },
  },
  {
    id: "gc19-review-reply",
    label: "MEO口コミ返信",
    input: "Googleの星2の口コミに返信したい。「予約時間に待たされた」という内容",
    classification: {
      intent: "create_text", domain: "美容室", output_type: "文書", complexity: 2,
      urgency: "now", needs_approval: true, fable_worthiness: "",
      title: "星2口コミへの返信", tags: ["店舗運営", "口コミ", "MEO"],
    },
    expect: { modelTier: "sonnet", approvalRequired: true, folder: "Company OS/店舗運営" },
  },
  {
    id: "gc20-task",
    label: "タスク管理",
    input: "今週やるべきことを整理して優先順位をつけて",
    classification: {
      intent: "manage", domain: "その他", output_type: "回答", complexity: 2,
      urgency: "today", needs_approval: false, fable_worthiness: "",
      title: "今週のタスク整理", tags: ["タスク", "進捗"],
    },
    expect: { modelTier: "sonnet", agent: "COO", approvalRequired: false, folder: "Projects" },
  },
];
