# 08. Agent 構成設計(要件⑧)

Agent = 「役割別のシステムプロンプト + 使用可能ツール + 既定モデル」の定義。
実装は `agents/<id>.md`(プロンプト、Vault管理)+ `lib/agents/registry.ts`(ツール・モデル設定)。

## 1. Agent 一覧(15体)

| Agent | 役割 | 既定モデル | 主なツール | 備考 |
|---|---|---|---|---|
| **CEO** | 経営判断・戦略・壁打ち | **Fable 5**(complexity≥4)/ Sonnet | Obsidian検索(判断ログ・価値観)、Sheets(数値) | 出力は必ず「判断ログ」形式で Company OS/ に保存 |
| **COO** | 実行管理・タスク分解・進捗・日報 | Sonnet | RouterRun 参照、report 生成 | パイプラインの report ステップ担当 |
| **CFO** | 財務・コスト管理・資金計画 | Sonnet(重要判断は Fable 5 へエスカレーション) | Sheets、Dashboard コストAPI | AI利用コストの番人でもある |
| **CMO** | マーケ戦略・キャンペーン設計 | Sonnet | 検索(web_search)、競合分析データ | SNS/Sales Agent の上位設計 |
| **CTO** | 技術判断・実装方針 | Opus 4.8 | リポジトリ参照、Claude Code 起票 | Claude Code へのタスク定義を生成 |
| **Sales** | 営業・提案書・商談準備 | Sonnet | プロンプトライブラリ(営業/)、Notion | |
| **HR** | 採用・求人・面接設計 | Sonnet | プロンプトライブラリ(採用/) | |
| **Salon** | 美容室運営(既存 AI Salon OS の窓口) | Sonnet | 既存API群(meo/content/seo/reviews/digest…) | 既存資産の再利用ポイント |
| **Education** | 教材・カリキュラム設計 | Sonnet | プロンプトライブラリ(教育/)、image | |
| **SNS** | 発信(全媒体の投稿生成・整形) | Sonnet | image、n8n(WF-2 投稿) | 承認ゲート必須 |
| **Video** | 動画企画・台本・生成指示 | Sonnet + 動画生成AI | image、動画API(Phase2) | |
| **Knowledge** | Obsidian の読み書き・分類・リンク | Haiku/Sonnet | Vault(GitHub API) | save ステップ担当(05参照) |
| **Automation** | n8n ワークフロー設計・起動 | Sonnet | n8n API/webhook | 「これ自動化して」を受ける |
| **QA** | 品質管理(成果物の事前チェック) | Sonnet | チェックリスト(ブランド・事実・法務注意) | sns 承認ゲートの前段で自動実行 |
| **Reviewer** | レビュー・週次改善提案 | Sonnet(設計レビューは Opus 4.8) | 実行ログ、Dashboard 集計 | 07の改善案フィード担当 |
| **SNS Analyst** | 投稿結果の分析→学習→改善提案(オーナー承認で追加) | Sonnet | SNS各社の分析API、PostAnalytics | Day90。勝ちパターンを Knowledge 化し SNS Agent の文脈に注入 |

## 2. Agent 定義フォーマット

```markdown
---
id: ceo
name: CEO Agent
model_default: claude-sonnet-5
model_escalation: claude-fable-5      # complexity≥4 で昇格
tools: [obsidian_search, sheets_read]
save_to: "Company OS/経営判断"
---

# 役割
あなたは大竹一樹の経営参謀。判断基準は Vault の「Company OS/価値観」に従う。

# 行動原則
- 結論から述べ、根拠・リスク・代替案を添える
- 過去の類似判断([[経営判断]]ログ)を必ず参照する
- 決定事項は「背景/選択肢/決定/理由」で構造化して返す
…
```

- プロンプト本体は Vault 管理 → オーナーが Obsidian で直接編集でき、Git で履歴が残る
- `model_escalation` の発動条件は Router が判定(Agent 自身は昇格できない = コスト規律)

## 3. Agent 間連携

- 連携は Orchestrator のパイプラインとして表現(Agent同士が直接会話しない。ログが追える)
- 例: CMO(戦略)→ SNS(制作)→ QA(チェック)→ 承認 → Automation(投稿)→ COO(報告)
- エスカレーション: 各Agentは「これは経営判断が必要」と判定したら CEO ステップの追加を Router に要求できる

## 4. 実装順序

| フェーズ | Agent |
|---|---|
| Day7 | Knowledge, SNS, COO(report)— 例Aパイプラインに必要な3体 |
| Day30 | CEO, QA, Salon, Automation |
| Day90 | CMO, CFO, Education, Video, Reviewer |
| Day180 | CTO, Sales, HR(+AI秘書機能) |

## レビュー観点(オーナー確認事項)

- [ ] CEO Agent の判断基準(価値観)を最初に言語化するセッションを Day30 に設定してよいか(Fable 5 との壁打ちで抽出)
- [ ] 15体の優先順位は上表でよいか
