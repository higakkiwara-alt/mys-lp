# 05. Obsidian 連携設計(要件⑤)

すべての成果物・判断・知識を Markdown で蓄積する Knowledge 層。**Company OS の本体**。

## 1. Vault 構造(自動分類先)

```
CompanyOS-Vault/
├── Daily Note/        2026-07-07.md(その日の全実行・判断・気づきが自動追記される)
├── Projects/          進行中プロジェクト単位(告知キャンペーン, 教材シリーズ, 採用強化…)
├── Knowledge/         再利用可能な知識(美容技術, マーケ知見, 競合分析, 教育理論…)
├── Meeting/           会議・音声メモの文字起こし+要約+決定事項
├── Prompt/            プロンプトライブラリ(04参照)
└── Company OS/        経営の中核
    ├── 経営判断/       判断ログ(背景・選択肢・決定・理由)← 経営判断AIの学習源
    ├── 価値観/         大竹一樹の判断基準・哲学(壁打ちから自動抽出)
    ├── 事業計画/
    └── SOP/           業務手順書(売却時の引き継ぎ資産)
```

## 2. ノート形式(自動生成テンプレート)

```markdown
---
type: project | knowledge | meeting | decision | daily
title: 新メニュー告知キャンペーン
date: 2026-07-07
tags: [美容室, SNS, Instagram, 告知]        # タグ自動生成
project: "[[Projects/2026-07 新メニュー]]"   # 双方向リンク自動付与
source: router-run:cln8abc123               # 実行ログへの参照
agents: [SNS, Knowledge]
cost_usd: 0.12
---

# 概要
(Sonnet が生成した要約)

# 本文
(成果物)

# 関連ノート
- [[Knowledge/Instagram運用の勝ちパターン]]   # 類似ノートへの自動リンク
- [[Daily Note/2026-07-07]]
```

### 自動処理(Knowledge Agent の責務)

| 機能 | 実装 |
|---|---|
| **Markdown保存** | 全パイプラインの `save` ステップで書き込み |
| **タグ自動生成** | Haiku が本文から5個前後を抽出。既存タグ一覧を渡して表記ゆれを防止 |
| **双方向リンク** | 既存ノートのタイトル+タグと照合し、関連上位3件に `[[リンク]]` を挿入。Daily Note へも相互リンク |
| **自動分類** | Classifier の `domain`/`intent` から保存先フォルダを決定(上記構造にマップ) |
| **Daily Note** | その日の全実行を時系列で追記(1行サマリ+リンク) |
| **判断ログ抽出** | Fable 5 との壁打ち・経営判断は、終了時に「背景/選択肢/決定/理由」を構造化して `Company OS/経営判断/` に別ノート化 |

## 3. 同期アーキテクチャ

```
Router/Agents(Vercel) ──git commit/push──▶ GitHub(private: companyos-vault)
                                              │
                        Obsidian(PC/スマホ)◀──┘ Obsidian Git プラグインで pull/push
```

- **Vault = Gitリポジトリ** とし、サーバー側は GitHub API(または git)で書き込む
- ロックインなし・履歴が残る・売却時にそのまま移転できる
- 逆方向(人間が Obsidian で書いたメモ)も Router の知識検索対象になる(pull して読む)
- 代替案: Obsidian Local REST API プラグイン(常時起動PCが必要なため不採用。Git 方式を推奨)

## 4. 知識検索(RAG-lite)

- Phase1: frontmatter(タグ・タイトル)によるメタデータ検索 + Haiku リランキング
- Phase2: 埋め込みベクトル(Vault 全文)を DB に持ち、意味検索でパイプラインの文脈に注入
- これにより「過去に似た判断をしたか?」「以前の告知の反応は?」が全AIの文脈に入る

## レビュー観点(オーナー確認事項)

- [ ] Vault を GitHub private リポジトリで管理する方式でよいか
- [ ] フォルダ構成(特に Company OS 配下)に追加したいものはあるか
- [ ] 既存の Obsidian Vault があるか(あれば構造を移行設計に反映する)
