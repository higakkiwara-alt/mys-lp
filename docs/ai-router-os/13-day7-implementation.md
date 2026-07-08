# 13. Day7 実装ドキュメント(オーナー優先順位1〜5対応)

## 1. 非同期化(優先順位1)✅

- `POST /api/router/intake` は分類(約1〜2秒)後、**即時ACK**を返す:
  ```
  📥 受付完了「〇〇」
  想定処理: 方針整理 → 本文作成 → 画像・動画案 → 品質チェック → オーナー承認 → 投稿
  使用予定AI: Sonnet 5（標準）
  概算コスト: $0.085
  完了時に通知します
  ```
- 実行は応答後にサーバー内で継続(`next/server` の `after`)し、完了時に n8n 経由で **LINE Push 報告**
- テスト用に `sync: true` オプションで従来の同期実行も可能

## 2. 承認キュー(優先順位2)✅

- 承認必須条件(`plan.ts` の `needsApprovalQueue`):
  ① SNS投稿・外部送信(`needs_approval`) ② 重要判断(Fable 5使用) ③ 推定コスト $2 超(ポリシー可変)
- 承認前に publish ステップへ**絶対に到達しない**(回帰テストで「承認 index < 投稿 index」を20件全件検証)
- 承認待ちになると LINE に成果物プレビュー付きで通知。LINE からそのまま操作:
  - `承認 <runId>` → 続行(投稿へ)
  - `却下 <runId> <修正指示>` → 指示を反映して最初から再生成 → 再び承認待ちへ
  - `再実行 <runId>` → エラー実行の再実行
- API: `POST /api/router/runs/:id/approve`(X-ROUTER-SECRET 必須)

## 3. Orchestrator パイプライン(優先順位3)✅ — AI COO

`lib/router/orchestrator.ts` が1本の流れを管理:

```
依頼 → 分類(Haiku) → Agent選定・実行順序決定(plan.ts) → 実行(各Agent)
→ レビュー(QA Agent/Haiku: ブランド・薬機法/景表法・炎上リスク)
→ 再実行判断(QA不合格→フィードバック付き再生成1回 / エラー→リトライ2回 / 却下→修正指示反映で再生成)
→ Obsidian保存(全ステップ出力を構造化) → LINE報告
```

- 状態は DB に永続化(`currentStep`)。承認待ち・エラーから同じ関数で再開できる
- 全ステップが `RouterStep` に記録(モデル・トークン・コスト・所要時間・Fable使用理由)

## 4. Knowledge Agent 強化(優先順位4)✅

- 参照優先順位: **① ピン留めノート**(会社方針・価値観・売却構想。`RouterConfig.policy.pinnedNotes` で指定)
  → **② Company OS/ 配下** → **③ Prompts/ 配下** → **④ Vault全体**(計5件まで)
- 「過去の大竹の考え・会社方針・店舗ルール・過去プロンプト・売却構想」は ①② で優先ヒットする
- **推奨**: 会社方針・価値観をまとめたノートのパスを `pinnedNotes` に設定してください(全依頼で常時参照されます)
- 保存先はオーナー指定の仮マッピングに更新(Company OS/経営判断・店舗運営・採用・教育・AI・自動化・売却・M&A / Projects / Knowledge / Meetings / SNS / Daily Notes)

## 5. SNS Agent(優先順位5)✅

「告知して」→ 自動で以下のパイプラインが組まれる:

| ステップ | 内容 |
|---|---|
| 目的確認 | 目的・ターゲット・訴求整理。不足情報は前提を明示し「■オーナーへの確認事項」を列挙(承認時に確認できる) |
| 投稿案作成・媒体別最適化 | Instagram / LINE / X(ポリシーで媒体変更可)の文化に合わせて生成 |
| 画像/動画案 | 画像生成AIプロンプト + 15-30秒動画構成案 |
| QAレビュー | ブランド適合・法規リスク・誤字(不合格なら自動修正1回) |
| 承認待ち | LINEにプレビュー通知 → 承認/却下(修正指示) |
| 承認後投稿 | `N8N_PUBLISH_WEBHOOK_URL` へ送信(未設定なら承認済み下書きとして保存) |
| 結果分析→改善提案 | **Day30/90**(投稿APIの接続後。SNS Analyst Agent) |

## 6. ゴールデンケース20件(追加要件)✅

`tests/fixtures/golden-cases.ts` — オーナー指定の10カテゴリを含む20件
(スタッフ対応/不成約分析/SNS告知/求人/経営判断/クレーム/売却判断/n8n/Obsidian保存/LINE音声 + 検索/画像/動画/コード/Sheets/教材/営業/税務/口コミ返信/タスク)

- **レイヤー1(常時・CI)**: 分類→モデル階層・承認要否・承認前投稿禁止・担当Agent・保存先・ACK形式を検証
- **レイヤー2(APIキーがある環境のみ)**: 実際に Haiku で分類し intent/domain/complexity(±1)/承認要否を検証
- 運用開始後、実ログの分類結果で fixture の基準値を更新していく(実測ベースの回帰テストへ)

## テスト結果

`tsc --noEmit` ✅ / `npm test` ✅ 36件 pass(+ live 20件は APIキー環境で実行)/ `next build` ✅

## デプロイ時の追加作業

1. `npm run db:push`(RouterRun に承認・再開用カラム追加)
2. `.env` に `N8N_PUBLISH_WEBHOOK_URL` を追加(任意。未設定なら投稿は手動)
3. n8n の WF-0 を更新版(承認コマンド対応)に差し替え
4. `pinnedNotes` の設定(会社方針ノートのパス)— 設定方法は次フェーズで Dashboard に UI を作るまで、直接 RouterConfig を更新

## 改善提案(開発ルール⑥)

1. **承認UIの整備(Day30)**: LINEコマンドに加え、Dashboard に承認キュー画面(プレビュー・ワンタップ承認)
2. **Vercel実行時間の注意**: Fable の長考+パイプラインで300秒を超える場合がある。Day30 で QStash 等のジョブキュー化を検討
3. **投稿API接続(Day30)**: publish が n8n webhook までは繋がった。Instagram Graph / LINE 配信の実接続と、投稿結果の取得(分析→学習の入口)を Day30 で
4. **ピン留めノートの初期設定セッション**: CEO価値観の言語化(Day30予定)の成果物をそのまま pinnedNotes に設定するのが効率的
