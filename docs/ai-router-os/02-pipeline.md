# 02. AIパイプライン設計(要件② AI同士の連携)

一つの依頼で「思考→設計→文章→画像→動画→保存→SNS→報告」まで自動で流す仕組み。

## 1. パイプラインの考え方

- パイプラインは **ステップの配列**。各ステップは「Agent + モデル + 入力(前ステップの出力)+ 出力先」を持つ
- Router の Classifier が依頼から `pipeline` 配列を生成し、Orchestrator が順次/並列に実行する
- 各ステップの出力は必ず DB(RouterStep)と Obsidian に記録される
- **承認ゲート**: `sns`(投稿)ステップの直前で `waiting_approval` になり、承認後に再開(既定)

## 2. 標準ステップ定義

| ステップ | 担当Agent | モデル | 入力 → 出力 |
|---|---|---|---|
| `think` | CEO/該当ドメインAgent | Fable 5(complexity≥4)/ Sonnet | 依頼 → 方針・構成案 |
| `design` | 該当Agent | Sonnet | 方針 → 詳細設計(構成・見出し・仕様) |
| `write` | SNS/Education等 | Sonnet | 設計 → 本文(複数媒体分を一括生成可) |
| `image` | Video/SNS Agent | 画像生成AI | 本文 → サムネ・挿絵(プロンプト自動生成) |
| `video` | Video Agent | 動画生成AI | 台本+画像 → 動画(Phase2) |
| `save` | Knowledge Agent | — | 全成果物 → Obsidian(タグ・リンク付与、05参照) |
| `sheet` | Sheets Agent | — | データ → Google Sheets 追記/更新 |
| `notion` | Notion Agent | — | 成果物 → Notion ページ作成 |
| `sns` | SNS Agent | Sonnet | 本文 → 媒体別整形 → **承認** → 予約投稿(n8n経由) |
| `report` | COO Agent | Haiku/Sonnet | 全ステップ結果 → 実行レポート(LINE/メール通知) |

## 3. 代表パイプライン例

### 例A: 「新メニューの告知を出したい」

```
think(Sonnet: 訴求方針)
→ write(Sonnet: Instagram/LINE/ブログ 3種の原稿)
→ image(画像生成AI: 告知画像)
→ save(Obsidian: Projects/告知/2026-07-07-新メニュー.md)
→ sns(承認ゲート → n8n で各媒体へ予約投稿)
→ report(LINEに「完了+投稿予定時刻+コスト」)
```

### 例B: 「教育コンテンツを1本作る」

```
think(Fable 5: カリキュラム上の位置づけ・学習目標)※complexity高のときのみ
→ design(Sonnet: 章立て・演習設計)
→ write(Sonnet: 教材本文+講師台本)
→ image(図解3点)
→ video(Phase2: 台本→動画)
→ save(Obsidian: Knowledge/教育/…)
→ report
```

### 例C: 「先月の売上を分析して打ち手を出して」

```
sheet(Sheets Agent: 売上データ取得)
→ think(Fable 5: 経営分析・打ち手提案)← 経営判断なので Fable 5
→ save(Obsidian: Company OS/経営判断/2026-07-…)
→ report(判断ログとして蓄積された旨も通知)
```

## 4. Orchestrator 実装設計

```typescript
// lib/router/orchestrator.ts(骨子)
type StepDef = {
  name: string;              // think | write | image | ...
  agent: AgentId;            // 08参照
  model?: ModelId;           // 省略時は Agent 既定
  approval?: boolean;        // 承認ゲート
  parallel?: string[];       // 並列実行するステップ群(image と sheet 等)
};

async function runPipeline(run: RouterRun) {
  for (const step of run.plan.steps) {
    if (step.approval && !run.approved) return setStatus(run, "waiting_approval");
    const result = await executeStep(step, context);   // Agent呼び出し
    await recordStep(run, step, result);               // DB + トークン/コスト集計
    context.push(result);                              // 次ステップの入力に
  }
  await saveToObsidian(run, context);                  // save は常に実行
  await notifyReport(run);                             // report は常に実行
}
```

- 状態は DB に永続化 → サーバー再起動・Vercel のタイムアウトに耐えるよう **1ステップ=1ジョブ** で分割実行(cron or QStash で再開)
- 長時間ステップ(動画生成)は webhook コールバックで完了を受ける
- 将来、この Orchestrator の定型部分は n8n へ移せる(06参照)。判断が要る部分だけコードに残す

## 5. コンテキストの受け渡し

- 各ステップには「依頼原文 + 直前ステップ出力 + 関連 Obsidian ノート(タグ検索で上位3件)」を渡す
- これにより**過去の判断・スタイル・価値観が自動で文脈に入る** = Company OS の中核動作

## レビュー観点(オーナー確認事項)

- [ ] 承認ゲートは `sns` のみでよいか(`video`(生成コスト大)にも置くか)
- [ ] report の通知先は LINE でよいか
- [ ] 例A〜Cのような代表パイプラインで、Day7 に最初に動かすべきものはどれか(推奨: 例A)
