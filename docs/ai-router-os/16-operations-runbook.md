# 16. 実運用フェーズ Runbook(Day90承認後)

**目的: 機能追加ではなく、実ログ・判断品質・コスト・承認フローの使いやすさ・CEO Memory精度・RAG参照精度を確認する。**
**Day180 は着手しない。自動投稿・自動メール・自動契約・自動決済・人事評価の自動決定は引き続き禁止。**

以下、`<APP>` = 本番URL、`<SECRET>` = ROUTER_WEBHOOK_SECRET の値。

## Phase 1: 本番投入(30〜60分)

```bash
# 1. Vercel の環境変数を設定（.env.local.example 参照）
#    必須: ANTHROPIC_API_KEY / DATABASE_URL / ROUTER_WEBHOOK_SECRET
#    推奨: OBSIDIAN_VAULT_REPO / OBSIDIAN_VAULT_TOKEN / OPENAI_API_KEY / N8N_REPORT_WEBHOOK_URL
#    設定しない: N8N_PUBLISH_WEBHOOK_URL（オーナー方針: 承認済み下書きまで）

# 2. DBスキーマ反映（ローカルから本番DBに対して）
npm run db:push

# 3. デプロイ後、本番前チェック — overall が ok/warn になればOK（failは項目の指示に従う）
curl -s "<APP>/api/router/health" -H "X-ROUTER-SECRET: <SECRET>"

# 4. Vault シード（CEO Principles + プロンプト30本。既存ファイルは上書きしない）
curl -s -X POST "<APP>/api/router/seed" -H "X-ROUTER-SECRET: <SECRET>"

# 5. RAG 初回インデックス（手順2: remaining が 0 になるまで。?full=1 で予算内一括処理）
curl -s -X POST "<APP>/api/router/vault-index?full=1" -H "X-ROUTER-SECRET: <SECRET>"
# → {"remaining": 0} になるまで繰り返し実行（大規模Vaultは2〜3回）

# 6. GitHub Actions の設定確認: vars.APP_URL / secrets.CRON_SECRET
#    （router-tick 5分毎 / router-weekly 月曜6時 / vault-index 毎日3時 が動き出す）
```

**n8n 差し替え(手順3):**
1. WF-0 を最新版 `wf-0-voice-intake.json` に差し替え(「結果」コマンド対応版)
2. WF-1(報告)は変更なし
3. WF-3 `wf-3-video-intake.json` をインポートし、`VIDEO_DRIVE_FOLDER_ID` に**パイロット用フォルダ**を設定

## Phase 2: 優先テストケース(オーナー指定8件)

各ケースは LINE から送るだけ。✅の観点を確認したら Dashboard(`/dashboard/router`)で実行ログ・コスト・保存先も見る。

| # | テスト | やり方 | 確認する観点 |
|---|---|---|---|
| 1 | 音声メモ→知識化 | LINEに音声で「今日のミーティングで決まったこと…」 | 即時ACK→ 要約+タスク化 → `Meetings/` 保存 → LINE報告 |
| 2 | 経営判断相談 | 「2号店の出店を検討したい。資金面から判断して」 | Fable昇格(理由つき)→ 承認待ち → 判断ログ → **CEO Memory記録の通知** |
| 3 | スタッフ対応相談 | 「新人が遅刻を繰り返す。指導方法を整理して」 | プロンプトライブラリ(スタッフ対応)適用 → `Company OS/店舗運営/` 保存 |
| 4 | 口コミ/クレーム | 「星2の口コミに返信したい。内容は『待たされた』」 | 返信案+改善案+教育コンテンツ → QA → **承認待ちで停止**(勝手に送信しない) |
| 5 | SNS告知 | 「夏の紫外線ケアメニューを告知して」 | 媒体別下書き+画像案 → 承認待ち → 承認しても**下書き保存まで**(投稿されない) |
| 6 | BMU動画10本 | パイロット用Driveフォルダに10本だけ入れる | 分析→改善→ロールプレイ生成 → `Company OS/営業分析/` 蓄積。**11本目以降は自動保留**される(日次上限10) |
| 7 | 動画1本→教材化 | 教育系動画1本をフォルダへ | 知識化→教材→SNS→Shorts案→YouTube案の一本化 |
| 8 | 週次レビュー | `curl -X POST <APP>/api/router/review -H "X-ROUTER-SECRET: <SECRET>"` | 5軸評価の改善提案 → `Logs/週次レビュー/` + Dashboard金枠 + LINE |

**CEO Memory の結果蓄積(手順7)**: 判断を実行に移して結果が出たら、LINEで
`結果 <runId> 出店を決定し、3ヶ月で単月黒字化` のように返信 → 判断記録に結果が紐づく。

## Phase 3: 計測と次回レビュー

**2〜4週間の運用後**、次のコマンド1つでオーナー指定の報告項目がすべて出ます:

```bash
curl -s "<APP>/api/router/ops-report?days=30&format=md" -H "X-ROUTER-SECRET: <SECRET>"
```

出力内容: 処理件数(入口別・状態別)/ **承認率** / **差し戻し率** / 平均・合計コスト /
**Fable使用回数と理由一覧** / RAG参照率・方式・よく参照されたノートTop10 /
CEO Memory件数・結果記録率 / エラー一覧。

定性評価(数値で出ないもの)のチェック観点:
- **RAG精度**: 各実行の詳細(Dashboard)で `vaultRefs` を見て「この参照は妥当だったか」を数件抜き打ち確認
- **CEO Memory有用性**: 2回目以降の経営判断で「過去の大竹一樹の判断」引用が妥当か
- **承認フローの使いやすさ**: LINEコマンドとDashboardのどちらを使ったか、滞留時間(レポートに出る)

## Day180 ゲート(着手前に整備が必要な8項目)

オーナー指定の前提。次回レビューで Day180 に進むと判断した場合、**最初のスコープはこの8項目**(機能追加より先):

- [ ] サーバー認証(Dashboard/APIの本人確認)
- [ ] 監査ログ(誰が・いつ・何を承認/変更したか)
- [ ] ロール権限(オーナー/スタッフの操作範囲)
- [ ] 外部送信の承認フロー(送信内容・宛先の事前確定と記録)
- [ ] 操作履歴(承認・却下・ポリシー変更の履歴画面)
- [ ] 失敗時の停止ルール(連続エラーでの自動停止・通知)
- [ ] コスト上限(全体の月次ハードリミット)
- [ ] 人間承認の境界線の明文化(何は自動でよく、何は必ず人間か)

これらが揃うまで、自動投稿・自動メール送信・自動契約・自動決済・人事評価の自動決定は**実装しない**。

## トラブルシューティング

| 症状 | 確認 |
|---|---|
| LINEに返信が来ない | n8n WF-0 の実行履歴 → `ROUTER_BASE_URL`/`ROUTER_SECRET` 変数 |
| 完了通知が来ない | `N8N_REPORT_WEBHOOK_URL` 設定 + WF-1 の実行履歴 |
| 実行が止まったまま | `/api/router/tick` を手動実行(5分毎のActionsが復旧させる設計) |
| Obsidianに保存されない | `/api/router/health` の vault 項目 → PAT の権限(contents: read/write) |
| RAGが効いていない | health の rag:index 件数 → vault-index を実行。実行詳細の `retrievalMethod` が `rag` になっているか |
