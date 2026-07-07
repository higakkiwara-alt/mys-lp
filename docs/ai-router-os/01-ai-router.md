# 01. AI Router 設計(要件①)

依頼内容を解析し、最適なAI・Agentへ自動振り分けするコアエンジン。

## 1. 処理フロー

```
依頼(自然文)
  │
  ▼
[1] Intake: 正規化(入力元・添付・依頼者を付与)
  │
  ▼
[2] 分類(Classifier): Haiku 4.5 が依頼を構造化JSONに変換
  │    { intent, domain, output_type, complexity, urgency, needs_approval }
  │
  ▼
[3] ルーティング(Rule Table): 分類結果 → 実行プラン(モデル/Agent/Pipeline)
  │    + コスト見積を算出
  │
  ▼
[4] 実行(Orchestrator): 単発 or パイプライン実行(02参照)
  │
  ▼
[5] 記録: 実行ログ(DB)+ 成果物(Obsidian)+ Dashboard 反映
```

## 2. 分類スキーマ(Classifier 出力)

Haiku 4.5 + Structured Outputs(`output_config.format`)で以下を強制:

```json
{
  "intent": "think | create_text | create_code | create_image | create_video | search | data | automation | knowledge | manage",
  "domain": "経営 | 美容室 | SNS | 教育 | 営業 | 採用 | 財務 | 法務 | 技術 | その他",
  "output_type": "回答 | 文書 | コード | 画像 | 動画 | スプレッドシート | Notionページ | Obsidianノート | ワークフロー",
  "complexity": 1-5,
  "urgency": "now | today | this_week",
  "needs_approval": true/false,
  "pipeline": ["think", "design", "write", "image", "video", "save", "sns", "report"]
}
```

- `complexity` 4以上 かつ `intent: think` のときだけ Fable 5 を許可(コスト規律)
- `pipeline` が2要素以上なら Orchestrator がパイプライン実行(02参照)
- 分類コスト: 約 $0.002/件(Haiku、入力1.5K+出力0.3Kトークン想定)— 全依頼に付けても無視できる

## 3. ルーティングテーブル(要件①の対応表)

| 依頼の種類 | intent | 振り分け先 | モデル/実装 |
|---|---|---|---|
| 深い思考・経営判断・戦略設計・壁打ち | `think` (complexity≥4) | **Fable 5** | `claude-fable-5` + 該当Agent(CEO等)のシステムプロンプト |
| 通常の思考・分析(complexity≤3) | `think` | Sonnet | `claude-sonnet-5`(コスト規律。03参照) |
| 大量文章生成(ブログ・台本・教材) | `create_text` | **Sonnet** | `claude-sonnet-5`(ストリーミング) |
| コード生成・実装 | `create_code` | **Claude Code** | Claude Code セッション起票(タスク定義を自動生成)/軽微なものは Opus 4.8 API |
| 画像 | `create_image` | **画像生成AI** | 画像生成API アダプタ(既存 image-studio 統合) |
| 動画 | `create_video` | **動画生成AI** | 動画生成API アダプタ(Phase2。初期は画像+テロップ動画) |
| 検索・最新情報 | `search` | **検索AI** | Sonnet + `web_search_20260209` サーバーツール |
| スプレッドシート操作 | `data` | **Google Sheets Agent** | Sheets API アダプタ + Sonnet |
| Notion操作 | `data` | **Notion Agent** | Notion API アダプタ + Sonnet |
| ナレッジ保存・検索 | `knowledge` | **Obsidian Agent** | Vault 読み書きアダプタ + Sonnet(05参照) |
| 定型自動化・連携 | `automation` | **Automation Agent (n8n)** | n8n webhook 起動(06参照) |
| タスク管理・進捗 | `manage` | COO Agent | Sonnet |

### フォールバック規則

- 分類の確信度が低い(Classifier が `intent` を決めきれない)→ Sonnet で「確認質問を1つだけ」返す
- Fable 5 が `stop_reason: "refusal"` → Opus 4.8 に自動フォールバック(server-side fallbacks)
- 外部API(画像・Sheets等)が失敗 → 3回リトライ(指数バックオフ)→ 失敗ログ + Dashboard にエラー表示

## 4. API 設計

```
POST /api/router/intake     依頼受付 → 分類 → 実行プラン返却(即時) or 実行キュー投入
GET  /api/router/runs/:id   実行状況・結果の取得
POST /api/router/runs/:id/approve   承認ゲートの承認(SNS投稿・経営判断など)
GET  /api/router/runs       実行履歴(Dashboard 用)
```

### DB スキーマ(Prisma 追加分・骨子)

```prisma
model RouterRun {
  id           String   @id @default(cuid())
  input        String   // 依頼原文
  source       String   // web | line | voice | n8n | cron
  classification Json   // Classifier 出力
  plan         Json     // 実行プラン(モデル/Agent/Pipeline)
  status       String   // queued | running | waiting_approval | done | error
  steps        RouterStep[]
  inputTokens  Int      @default(0)
  outputTokens Int      @default(0)
  costUsd      Decimal  @default(0)
  durationMs   Int?
  error        String?
  obsidianPath String?  // 成果物の保存先
  createdAt    DateTime @default(now())
}

model RouterStep {
  id        String  @id @default(cuid())
  runId     String
  run       RouterRun @relation(fields: [runId], references: [id])
  name      String  // think | write | image | save | sns | report ...
  agent     String  // CEO | SNS | Knowledge ...
  model     String? // claude-fable-5 | claude-sonnet-5 | dall-e | ...
  status    String
  inputTokens Int   @default(0)
  outputTokens Int  @default(0)
  costUsd   Decimal @default(0)
  output    String? // 成果物 or 保存先参照
  createdAt DateTime @default(now())
}
```

## 5. 実装方針(Day1 スコープ)

1. `lib/router/classifier.ts` — Haiku 分類(structured outputs)
2. `lib/router/routes.ts` — ルーティングテーブル(上表をコード化。**設定ファイルとして編集可能に**)
3. `lib/router/models.ts` — モデルID・価格の一元管理
4. `app/api/router/intake/route.ts` — 受付API
5. 単発実行のみ(パイプラインは Day7 スコープ、02参照)

## レビュー観点(オーナー確認事項)

- [ ] complexity≥4 のみ Fable 5 という閾値でよいか(もっと絞る/緩める)
- [ ] 依頼の入口は何を優先するか: Web UI / LINE / 音声 / Slack(Day1 は Web UI を想定)
- [ ] Claude Code への振り分けは「タスク定義を作ってセッション起票」方式でよいか
