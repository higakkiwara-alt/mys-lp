# AI Router OS — 設計ドキュメント(Phase 0: 設計)

> **ステータス: 🟢 Day90 承認済み → 🏃 実運用フェーズ(2026-07-08〜)**
> 運用手順: [16-operations-runbook.md](./16-operations-runbook.md)(本番投入・8テストケース・計測・Day180ゲート)
>
> 承認記録: [11-approved-decisions.md](./11-approved-decisions.md) /
> 実装: Day1 [12](./12-day1-implementation.md) / Day7 [13](./13-day7-implementation.md) / Day30 [14](./14-day30-implementation.md) / Day90 [15](./15-day90-implementation.md)
> **絶対ルール(オーナー指定): 承認前に外部への投稿・送信・公開を実行しない。**
> Day90 ゴール(オーナー指定): AIが会社全体の知識・判断・改善を支え、**人間が最終判断を行える状態**を作る。
> **Day180 は未着手**(前提8項目=認証/監査ログ/権限/送信承認/操作履歴/停止ルール/コスト上限/承認境界 の整備後)。

## 目的(最重要事項)

このプロジェクトは単なるAIツール開発ではない。

**「大竹一樹の経営判断・思考・価値観・知識を蓄積し、会社全体をAIと人が協働して自走できる Company OS」を構築する**ことが目的である。

すべての設計判断はこの目的に従う。具体的には:

1. **蓄積優先** — すべての依頼・判断・成果物は Markdown として Obsidian Vault に残り、将来のAIの文脈になる
2. **依頼を投げるだけ** — 利用者はAIを選ばない。Router が解析し、最適なAI・Agentへ自動振り分けする
3. **コスト規律** — Fable 5(最高知能・最高コスト)は経営判断・戦略のみ。標準は Sonnet、実装は Claude Code
4. **事業横展開** — 美容室AI → AIコンサル → 社内AI秘書 → SNS → 教育 → 経営判断AI → 会社OS → 売却(Exit)まで同一基盤で拡張
5. **売却を見据えた設計** — 属人化を排し、ドキュメント・データ・ワークフローが資産として第三者に移転可能であること

## ドキュメント構成

| # | ファイル | 内容 | 要件対応 |
|---|---|---|---|
| 0 | [00-vision.md](./00-vision.md) | ビジョン・全体アーキテクチャ・技術選定 | 最重要事項 |
| 1 | [01-ai-router.md](./01-ai-router.md) | AI Router(解析・振り分けエンジン) | ①③ |
| 2 | [02-pipeline.md](./02-pipeline.md) | AIパイプライン(思考→設計→…→報告) | ② |
| 3 | [03-cost-optimization.md](./03-cost-optimization.md) | コスト最適化ルール・推定コスト | ③ |
| 4 | [04-prompt-library.md](./04-prompt-library.md) | プロンプトライブラリ(用途別) | ④ |
| 5 | [05-obsidian.md](./05-obsidian.md) | Obsidian連携(Vault構造・自動分類) | ⑤ |
| 6 | [06-n8n.md](./06-n8n.md) | n8nワークフロー設計 | ⑥ |
| 7 | [07-dashboard.md](./07-dashboard.md) | Dashboard(使用量・コスト・成功率) | ⑦ |
| 8 | [08-agents.md](./08-agents.md) | 15 Agent 構成(CEO〜Reviewer) | ⑧ |
| 9 | [09-roadmap.md](./09-roadmap.md) | ロードマップ(Day1〜Day365) | ⑨ |
| 10 | [10-dev-process.md](./10-dev-process.md) | 開発プロセス・承認フロー | ⑩ |
| 11 | [11-approved-decisions.md](./11-approved-decisions.md) | 設計承認記録(2026-07-08)・AI COO要件 | — |
| 12 | [12-day1-implementation.md](./12-day1-implementation.md) | Day1 実装ドキュメント・改善提案 | — |
| 13 | [13-day7-implementation.md](./13-day7-implementation.md) | Day7 実装(非同期・承認キュー・AI COO・SNS) | — |
| 14 | [14-day30-implementation.md](./14-day30-implementation.md) | Day30 実装(Dashboard・ジョブキュー・プロンプト30本・音声WF・CEO Principles) | — |
| 15 | [15-day90-implementation.md](./15-day90-implementation.md) | Day90 実装(Reviewer・RAG・動画WF・不成約分析・口コミ・CEO Memory) | — |
| 16 | [16-operations-runbook.md](./16-operations-runbook.md) | 実運用 Runbook(本番投入・テスト8件・レポート・Day180ゲート) | — |

## レビューの進め方

1. `00-vision.md` → `01-ai-router.md` → `03-cost-optimization.md` の順で読む(コア設計)
2. 各ドキュメント末尾の「レビュー観点」に回答する
3. 承認 or 修正指示をもらい次第、`09-roadmap.md` の Day1 スコープから実装を開始する

## 既存資産との関係

本設計は既存の **AI Salon OS**(このリポジトリ: Next.js 15 + TypeScript + Prisma + Anthropic SDK)の上に構築する。
既存の API Routes(content / meo / seo / digest / brain 等)は、AI Router OS から見ると「Salon Agent のツール群」として再利用される。ゼロから作り直さない。
