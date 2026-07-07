# 00. ビジョンと全体アーキテクチャ

## 1. ゴール

「依頼を投げるだけ」で最適なAIが自動選択され、思考→制作→保存→発信→報告まで自走する **AI Router OS** を構築し、
最終的に会社全体を **Company OS** として資産化する(売却可能な状態にする)。

### 事業展開ロードマップとの対応

| フェーズ | 事業 | AI Router OS が担う役割 |
|---|---|---|
| 1 | 美容室AI事業(Mys立川) | 既存 AI Salon OS を Salon Agent として統合。実運用でRouterを鍛える |
| 2 | AIコンサル事業 | Router + Agent構成をテンプレート化し、他社に展開できる商品にする |
| 3 | 社内AI秘書 | 音声・メール・カレンダー・タスクを Router 経由で処理 |
| 4 | SNS運用 / 教育コンテンツ | Pipeline(文章→画像→動画→投稿)の量産運転 |
| 5 | 経営判断AI | 蓄積された判断ログ(Obsidian)を文脈に、CEO Agent が意思決定支援 |
| 6 | 会社OS → 売却 | 全事業のデータ・ワークフロー・ナレッジが移転可能な資産になる |

## 2. 全体アーキテクチャ

```
                        ┌─────────────────────────────┐
  依頼(テキスト/音声/    │        AI Router OS          │
  LINE/Slack/Web UI)───▶│                             │
                        │  ① Intake(受付・正規化)      │
                        │  ② Router(解析・振り分け)    │──▶ Fable 5(経営判断・戦略・壁打ち)
                        │  ③ Orchestrator(Pipeline実行)│──▶ Sonnet(標準・大量文章)
                        │  ④ Agent層(15 Agents)       │──▶ Claude Code(実装)
                        │  ⑤ Tool層(外部連携)         │──▶ 画像生成AI / 動画生成AI / 検索AI
                        │                             │──▶ Google Sheets / Notion / Obsidian / n8n
                        └──────────┬──────────────────┘
                                   │ すべての入出力を記録
                        ┌──────────▼──────────────────┐
                        │  Knowledge層(Obsidian Vault) │  Markdown / タグ / 双方向リンク
                        │  + DB(Postgres: 実行ログ)    │  Daily Note / Projects / Company OS
                        └──────────┬──────────────────┘
                                   │
                        ┌──────────▼──────────────────┐
                        │  Dashboard(使用量/コスト/    │
                        │  成功率/エラー/改善案)        │
                        └─────────────────────────────┘
```

### レイヤー責務

| レイヤー | 責務 | 実装 |
|---|---|---|
| Intake | 依頼の受付(Web UI / LINE / 音声 / n8n webhook)、正規化 | Next.js API Route `/api/router/intake` |
| Router | 依頼の分類(タスク種別・必要知能・出力形式)、モデル/Agent決定、コスト見積 | Haiku による分類 + ルールテーブル(01参照) |
| Orchestrator | 複数ステップのパイプライン実行、リトライ、状態管理 | Next.js + DB(将来 n8n に委譲可能) |
| Agent層 | 役割別の専門Agent(CEO/COO/…/Reviewer) | システムプロンプト + ツール定義(08参照) |
| Tool層 | 外部API(画像・動画・検索・Sheets・Notion・Obsidian・n8n) | アダプタ実装 |
| Knowledge層 | 全成果物・判断ログのMarkdown保存、自動分類・タグ・リンク | Obsidian Vault(Git同期)(05参照) |
| Dashboard | 実行ログの可視化 | 既存 dashboard に `/dashboard/router` 追加(07参照) |

## 3. 技術選定(既存資産を活かす)

| 項目 | 選定 | 理由 |
|---|---|---|
| 基盤 | 既存リポジトリ(Next.js 15 / TypeScript / Prisma / Vercel) | AI Salon OS と同居。二重管理を避ける |
| LLM | Anthropic API(`@anthropic-ai/sdk` 導入済み) | Fable 5 / Opus / Sonnet / Haiku を単一SDKで使い分け |
| 実行ログDB | PostgreSQL(Supabase)+ Prisma | 導入済み。Dashboard の集計元 |
| ナレッジ | Obsidian Vault(Gitリポジトリ同期) | Markdown = 移転可能な資産。API不要でロックインなし |
| 自動化 | n8n(セルフホスト or Cloud) | 音声→文字起こし→…の定型フローを担当 |
| 画像 | 画像生成API(第一候補: OpenAI Images。`openai` SDK導入済み) | 既存 image-studio と統合 |
| 動画 | 動画生成API(Runway / Kling 等。Phase2で選定) | 初期はテンプレ動画(画像+音声合成)で代替 |
| 検索 | Claude の Web Search ツール(`web_search_20260209`) | 追加ベンダー不要 |

### モデルID(2026-06時点の正式ID)

| 役割 | モデル | ID | 価格(入力/出力 per 1M tokens) |
|---|---|---|---|
| 経営判断・深い思考・戦略・壁打ち | Claude Fable 5 | `claude-fable-5` | $10.00 / $50.00 |
| 高度な実装・レビュー(Claude Code) | Claude Opus 4.8 | `claude-opus-4-8` | $5.00 / $25.00 |
| 標準・大量文章生成 | Claude Sonnet 5 | `claude-sonnet-5` | $3.00 / $15.00(2026-08-31まで $2.00 / $10.00) |
| 分類・要約・ルーティング判定 | Claude Haiku 4.5 | `claude-haiku-4-5` | $1.00 / $5.00 |

> 注: Fable 5 は thinking 常時ON・`temperature` 等不可・`stop_reason: "refusal"` 対応が必要。
> 実装時は `fallbacks: [{model: "claude-opus-4-8"}]`(beta `server-side-fallback-2026-06-01`)を必ず付与する。

## 4. 設計原則

1. **Router を通らない AI 呼び出しを作らない** — すべての呼び出しが記録・課金集計・改善の対象になる
2. **Markdown ファースト** — 成果物は必ず Obsidian に Markdown で残る。DB は「ログ」、Vault は「資産」
3. **安いモデルで判定し、高いモデルで考える** — 分類は Haiku、生成は Sonnet、判断は Fable 5
4. **人間の承認ゲートを設計に含める** — 発信(SNS投稿)・支出・経営判断は必ず承認ステップを挟む(自動化は「下書きまで」が既定)
5. **各フェーズ小さく作り、動かして学ぶ** — 一括大量実装をしない(ルール⑩)

## レビュー観点(オーナー確認事項)

- [ ] 事業フェーズの順序(美容室→コンサル→秘書→…)はこの通りでよいか
- [ ] 基盤を既存リポジトリ(AI Salon OS)に同居させる方針でよいか(別リポジトリ案もあり)
- [ ] 動画生成AIの初期選定を Phase2 に先送りしてよいか
- [ ] SNS投稿は「自動下書き+人間承認後に投稿」を既定としてよいか(完全自動投稿はリスクあり)
