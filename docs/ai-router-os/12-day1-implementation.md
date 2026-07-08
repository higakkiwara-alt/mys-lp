# 12. Day1 実装ドキュメント(開発ルール⑤)

## 実装物一覧

```
lib/db.ts                      Prisma クライアント(シングルトン)
lib/router/models.ts           モデルID一元管理(Fable/Opus/Sonnet/Haiku)
lib/router/pricing.ts          価格テーブル・実測コスト計算・事前見積
lib/router/config.ts           可変ポリシー(Fable閾値・日次上限・承認必須)。DB上書き可 = 自動最適化の土台
lib/router/classifier.ts       Complexity判定(Haiku・zodバリデーション・fable_worthiness抽出)
lib/router/guard.ts            Fableガード(閾値・理由必須・日次上限で自動降格)
lib/router/routes.ts           ルーティングテーブル(10 intent → Agent/モデル/推定コスト)
lib/router/executor.ts         実行(Obsidian参照→Agent人格→モデル呼び出し。Fableはrefusal時Opusへ自動フォールバック)
lib/router/notify.ts           n8n接続(intakeシークレット検証・完了報告webhook)
lib/obsidian/vault.ts          Vault連携(GitHub API: 検索/読取/保存/Daily Note追記/自動分類)
app/api/router/intake/route.ts 受付API(冪等性・全ステップ記録・コスト集計)
app/api/router/runs/route.ts   実行履歴+統計(今日/今月/モデル別)
app/api/router/runs/[id]/route.ts 実行詳細(ステップタイムライン)
tests/router.test.ts           ユニットテスト15件(価格・ガード・ルーティング・分類先)
docs/ai-router-os/n8n-templates/  WF-0(音声/LINE→Router)・WF-1(報告→LINE)
prisma/schema.prisma           RouterRun / RouterStep / RouterConfig 追加
```

## セットアップ(デプロイ手順)

1. `.env.local` に追加(`.env.local.example` 参照):
   `ROUTER_WEBHOOK_SECRET` / `N8N_REPORT_WEBHOOK_URL` / `OBSIDIAN_VAULT_REPO` / `OBSIDIAN_VAULT_TOKEN`
2. DB反映: `npm run db:push`(RouterRun/RouterStep/RouterConfig が作成される)
3. n8n Cloud に `n8n-templates/` の2本をインポート(手順は同ディレクトリ README)
4. 動作確認:
   ```bash
   curl -X POST https://<app>/api/router/intake \
     -H "Content-Type: application/json" \
     -d '{"input": "髪質改善の新メニューのInstagram投稿文を作って", "source": "web"}'
   ```

## テスト結果(検証④)

- `npx tsc --noEmit` ✅ / `npm test` ✅ 15/15 / `next build` ✅
- 未実施(API キー・DB・Vault が必要): 実環境での E2E。デプロイ後に代表5ケースで実測し、
  見積コストとの乖離(±30%基準)を確認する

## 設計からの差分・注意点

- **単発実行のみ**(Day1スコープ通り)。`needs_approval: true` の依頼も現時点では下書き生成まで
  (投稿機能自体が未接続のため安全)。承認キュー・パイプラインは Day7
- Vault 未設定でも動作する(保存・参照をスキップし、応答にその旨を表示)
- Vault 検索は GitHub code search(反映に数分の遅延あり)。Day90 で埋め込みベクトル検索に置換
- Fable 5 の web 検索は未使用(think 用途)。search intent は Sonnet + web_search
- `intake` は同期実行(maxDuration 300s)。Fable の長考で LINE 返信が遅れる場合、Day7 で非同期化(即時ACK→完了時Push)

## 改善提案(開発ルール⑥)

1. **非同期化を Day7 の最優先に**: 音声入口では「受け付けました(見積$X)」を即返し、完了時に LINE Push する方が体験が良い
2. **既存 Vault のフォルダ構成の確認**が必要(11の⑤)。`vaultFolderFor` のマッピングを実構造に合わせる
3. LINE の webhook を n8n を介さず直接受ける案もあるが、n8n 経由に統一した方が移植性・可観測性が高い(現設計を推奨)
4. Classifier のゴールデンケース(依頼文→期待ルート20件)を運用初週の実ログから作成し、リグレッションテスト化する
