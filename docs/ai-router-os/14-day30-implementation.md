# 14. Day30 実装ドキュメント(オーナー優先順位1〜5対応)

## 1. Dashboard(優先順位1)✅

`/dashboard/router` を追加(サイドバー「AI Router (COO)」)。15秒自動更新。

- **承認待ち一覧**: 成果物プレビュー(展開表示)・承認理由・「承認して実行」「修正指示付き再生成」「却下(中止)」ボタン
- **実行中・待機中**: ステップ進行表示(完了ステップは緑)
- **エラー**: エラー内容 + 「再実行」ボタン
- **完了**: 直近20件(結果サマリ・Obsidian保存先)
- **統計**: 今日/今月のコスト・件数、使用AI(モデル)別の呼び出し数とコスト、各実行の推定/実コスト併記
- Web からの承認操作は同一オリジンチェックで許可(本格的なサーバー認証は Day90 セキュリティ整備で導入)

## 2. ジョブキュー化(優先順位2)✅

外部サービスを増やさず **DBベースのジョブキュー** を実装(n8n Cloud と同じく移植容易):

- 各実行に**実行予算(240秒)**を設定。超過すると `status=queued` に戻して中断(進捗は `currentStep` に保存済み)
- `POST /api/router/tick` が「中断された queued」「8分以上更新のない running(クラッシュ復旧)」を拾い、続きから再開
- GitHub Actions(`router-tick.yml`)が**5分毎**に tick を呼ぶ(既存の daily-digest と同じ CRON_SECRET 方式)
- 楽観ロック(条件付き updateMany)で二重実行を防止
- → Fable の長考・多段パイプラインが Vercel の300秒制限を跨いでも完走する

## 3. プロンプトライブラリ30本(優先順位3)✅

指定10カテゴリ × 3本 = 30本(`prompts/library.ts`):
経営判断 / スタッフ対応 / クレーム対応 / 採用 / 教育 / SNS / 不成約分析 / 売却・M&A / 税務・法務 / n8n・Obsidian自動化

- **自動選択**: 依頼の分類・タグ・本文とのキーワード適合でプロンプトを選び、生成ステップに「様式」として注入。適合が低い場合は使わない(誤った様式の強制を避ける)
- **記録**: 使用した promptId を実行計画に記録 → 成功率追跡(Day90 の Reviewer 分析対象)
- **Vault同期**: `/api/router/seed` が `Prompts/<カテゴリ>/<タイトル>.md` として書き出し(Obsidianで編集可能)
- 税務・法務系には「専門家の確認が必要」を本文に組み込み済み

## 4. 音声→知識化WF(優先順位4)✅

`source=voice` かつ知識・管理系の依頼は専用パイプラインに:

```
音声 → 文字起こし(n8n WF-0/Whisper) → 要約・構造化(Knowledge Agent:
決定事項・数字・【要確認】付き) → 判断(重要度・要判断事項の分離)
→ タスク化(COO Agent: 担当/期限/優先度) → Obsidian保存(Meetings等へ自動分類)
→ LINE報告(常時)
```

音声でもSNS告知など発信系は従来どおりSNSパイプライン(承認付き)が優先される。

## 5. CEO価値観の言語化(優先順位5)✅ v1

- `Company OS/00_大竹一樹 CEO Principles.md` を作成(`/api/router/seed` で Vault に書き込み)
- 内容: 判断基準 / 経営哲学 / スタッフへの向き合い方 / 売却・FIRE構想 / AI会社構想 / 会社OSの原則
- 出典は本プロジェクトでの実際の指示・承認判断。**推測で補った箇所は【要確認】マーク付き**
- `DEFAULT_POLICY.pinnedNotes` に設定済み → **全依頼で常時参照される**
- 既存ノートとの統合・v2化は、Fable 5 との壁打ちセッションで(依頼例:「CEO Principles を一緒に更新したい。過去の判断を聞いてくれ」)

## デプロイ時の追加作業

1. GitHub リポジトリの Actions に `APP_URL`(vars)と `CRON_SECRET`(secrets)が設定済みか確認(既存 digest と共用)
2. デプロイ後に1回: `curl -X POST https://<app>/api/router/seed -H "X-ROUTER-SECRET: <secret>"`
   → CEO Principles + プロンプト30本が Vault に作成される(既存ファイルは上書きしない)
3. 投稿API(`N8N_PUBLISH_WEBHOOK_URL`)はオーナー指示どおり**未設定のまま**(承認済み下書き保存まで)

## テスト結果

`tsc --noEmit` ✅ / `npm test` ✅ 45件 pass(+ live 20件)/ `next build` ✅(新規ルート: seed / tick / dashboard)

## 改善提案(開発ルール⑥)

1. **Daily Digest の Router 統合**(旧Day30項目)は Day90 に移動 — Dashboard・承認フローの安定を優先したため
2. **CEO Principles v2 セッション**: 週1回の Fable 壁打ちで判断ログから Principles を自動更新する仕組みを Day90 で(Reviewer Agent の役割に追加)
3. **プロンプトの Vault 優先読込**: 現在はコード内の30本が正。Obsidian で編集された版を優先読込する双方向同期を Day90 で
4. **Dashboard 認証**: 現在は既存画面と同じクライアント側ガード+同一オリジンチェック。外部投稿APIを繋ぐ前にサーバー側認証を必須にする(Day90 セキュリティ整備)
