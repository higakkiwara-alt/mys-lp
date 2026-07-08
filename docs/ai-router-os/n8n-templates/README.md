# n8n テンプレート(Day1)

n8n Cloud にインポートして使うワークフロー。セルフホスト移行時も同じ JSON をそのまま使える
(接続先は環境変数 `ROUTER_BASE_URL` / credentials のみ。ノードにURLを直書きしない方針)。

## wf-0-voice-intake.json — 音声 → AI Router(基本設計の入口)

```
LINE(音声/テキスト受信 webhook)
→ [音声] コンテンツ取得 → Whisper 文字起こし → intake
→ [テキストが承認コマンド] /api/router/runs/{id}/approve へ
→ [通常テキスト] POST {ROUTER_BASE_URL}/api/router/intake
→ 応答の output(即時ACK: 受付完了/想定処理/使用予定AI/概算コスト)を LINE で返信
```

### 承認コマンド(LINEからそのまま返信)

- `承認 <runId>` — 承認して続行(投稿等へ進む)
- `却下 <runId> <修正指示>` — 修正指示を反映して作り直し(指示なしなら中止)
- `再実行 <runId>` — エラー実行の再実行

runId は承認待ち通知(WF-1 経由の LINE Push)に含まれる。

## wf-1-report.json — Router 完了報告 → LINE 通知

```
Webhook(/webhook/router-report, X-ROUTER-SECRET 検証)
→ LINE Push(summary をそのまま送信)
```

## セットアップ手順

1. n8n Cloud で 2つの JSON をインポート
2. Credentials を設定: LINE(Channel Access Token)、OpenAI(Whisper用)
3. n8n の環境変数(または Set ノード)に設定:
   - `ROUTER_BASE_URL`: 本番アプリURL(例 https://your-app.vercel.app)
   - `ROUTER_SECRET`: アプリ側 `ROUTER_WEBHOOK_SECRET` と同じ値
4. アプリ側 `.env` に `N8N_REPORT_WEBHOOK_URL` を wf-1 の Webhook URL に設定
5. LINE Developers で webhook URL を wf-0 の Webhook URL に設定

> 移植性: セルフホスト移行時は JSON をエクスポート→インポートし、credentials と2つの変数を再設定するだけ。
