# 11. 設計承認記録(2026-07-08 オーナー承認)

設計(00〜10)は以下の条件付きで**承認済み**。本ドキュメントが各設計docのレビュー観点への正式回答であり、
以降の実装はこの決定に従う。

## ① Fable 5 使用条件 — 承認(+自動最適化の要求)

- 開始値: complexity ≥ 4、日次上限 $10(実装: `lib/router/config.ts` の `DEFAULT_POLICY`)
- **固定にしない**: 閾値・上限は `RouterConfig` テーブル(DB)で可変。変更は `updatedBy` + `reason` 付きで監査可能
- 将来: Reviewer Agent が月間コスト・ROI・使用頻度・成果を分析し、ポリシーを自動更新(Day90)
- 最終形: 「この案件は Fable を使う価値がある」とAI自身が判断する
  - 布石として Classifier が全依頼に `fable_worthiness`(使う価値の理由)を出力し、
    実際の昇格判断・結果とともに `RouterStep.fableReason` に蓄積 → これが価値判断モデルの学習データになる

## ② 依頼の入口 — 音声 → LINE → Web の優先順位

- 基本フロー: **音声 → 文字起こし → AI Router → 各Agent → Obsidian保存 → (必要なら)SNS**
- 実装: n8n WF-0(LINE音声/テキスト → Whisper → `/api/router/intake`)を Day1 で提供
- Web UI は**管理画面**(Dashboard・承認キュー・履歴)として位置づけ

## ③ SNS — 承認後投稿がデフォルト

- 理想フロー: 音声→記事→画像→動画→SNSごとの最適化→レビュー→**オーナー承認**→投稿→**分析→学習**
- `requireApprovalForPublish: true` をポリシー既定値として実装済み
- 投稿後の分析(エンゲージメント取得)→学習(勝ちパターンの Knowledge 化)は Day30〜90
- **追加Agent**: 投稿結果から改善提案を行う「SNS Analyst Agent」を Agent 構成に追加(Day90、08に反映)

## ④ n8n — Cloud 版で開始、セルフホスト移行可能に

- ワークフロー JSON はリポジトリ管理(`n8n-templates/`)
- 接続先は変数(`ROUTER_BASE_URL` / `ROUTER_SECRET`)のみ。ノードにURL直書き禁止 → エクスポート/インポートだけで移行可能

## ⑤ Obsidian — 既存 Vault(Git同期済み)を使用。Company OS が正本

- 新規 Vault は作らず、**既存 Vault のリポジトリ**を `OBSIDIAN_VAULT_REPO` に設定する
- **Company OS = Source of Truth**: AIは判断の前に必ず Vault を参照する
  - 実装済み: `executor.ts` が実行前に `searchVaultContext()` で関連ノートを取得し、
    「判断の前提として必ず考慮」として文脈に注入。参照したノートは `vaultRefs` として記録
- 既存の大量の知識に合わせ、フォルダマッピング(`vaultFolderFor`)は運用初週に実際の構造へ調整する
  - **要確認**: 既存 Vault のトップレベル構成(フォルダ名)を教えてください → マッピングを合わせます

## 追加要件: AI Router = AI COO(AI執行責任者)

単なる振り分けではなく、**割り振り→進捗管理→レビュー→再実行→報告**まで責任を持つ。

| 責務 | Day1(実装済みの範囲) | Day7以降 |
|---|---|---|
| 割り振り | 分類→Agent/モデル選択 | パイプライン分解・並列割り振り |
| 進捗管理 | RouterRun/RouterStep で全ステップ記録 | 実行キュー・タイムアウト管理・承認待ち管理 |
| レビュー | — | QA Agent による成果物チェック(発信前必須) |
| 再実行 | エラー記録のみ | 品質不合格・失敗時の自動リトライ(最大2回)→ それでも失敗なら差し戻し |
| 報告 | 完了/エラーを n8n 経由で LINE 報告(実装済み) | 日次サマリ・週次改善提案 |

COO Agent のシステムプロンプトも「AI COO(執行責任者)」として定義済み。

## Day1 実装スコープ(本コミット)

✅ Router(`/api/router/intake`) ✅ Complexity判定(Haiku分類) ✅ AI選択(ガード+ルーティング)
✅ コスト記録(見積+実測) ✅ 実行ログ(RouterRun/RouterStep) ✅ Obsidian保存(+Daily Note+参照)
✅ n8n接続(intake認証+報告webhook+テンプレート2本)

→ 詳細は `12-day1-implementation.md`(実装ドキュメント)
