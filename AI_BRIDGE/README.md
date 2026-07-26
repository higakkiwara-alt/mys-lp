# AI Bridge 操作マニュアル

Claude CodeとCodex CLIの間のコピペを無くすための最小構成ブリッジです。
エンジニアでなくても使えるよう、このマニュアルだけで運用できるように書いています。

---

## 1. AI Bridgeとは何か

あなた → Claude Code → (必要なときだけ) Codex → Claude Codeが統合 → **承認待ちフォルダに保存**
という流れを自動化する仕組みです。ChatGPTの画面とClaudeの画面を行き来してコピペする作業が不要になります。

## 2. 何が自動になるか

- Claude CodeからCodexへの指示の受け渡し
- Codexの回答の回収と保存(Markdown+JSON)
- 実行ログの記録(標準出力・標準エラーを分けて保存)
- タスクごとのID採番と状態管理
- 成果物のwaiting_approval(承認待ち)フォルダへの保存

## 3. 何は自動にならないか(重要)

- **承認**: 成果物を正式版にするかはあなたが判断します
- **正式フォルダへの移動**: approveしてもファイルは自動で動きません
- **外部送信**: メール・SNS・アップロードは一切行いません
- **元ファイルの変更**: 入力ファイルは読み取り専用として扱われます

## 4. 基本的な使い方

ふだんはClaude Codeに日本語で頼むだけです(下の5を参照)。
手動でコマンドを打つ場合:

```bash
cd AI_BRIDGE/scripts

# 健全性チェック(まずこれ)
python3 check_bridge.py

# 1. タスク作成(IDが表示される 例: AI-20260727-001)
python3 run_ai_bridge.py new --title "○○のコードレビュー" --purpose "品質確認"

# 2. Codexへの指示を登録
python3 run_ai_bridge.py set-codex AI-20260727-001 --file 指示.md

# 3. Codex実行(回答が自動回収される)
python3 run_ai_bridge.py run AI-20260727-001

# 4. Claudeが統合した最終版を承認待ちへ保存
python3 run_ai_bridge.py integrate AI-20260727-001 --file 統合結果.md

# 状態確認
python3 run_ai_bridge.py status
```

## 5. Claude Codeへの依頼例(コピペして使えます)

- 「これをCodexにもレビューさせて」
- 「このコードをCodexで検証して」
- 「Claude案とCodex案を統合して」
- 「この案件をAI Bridgeで処理して」
- 「Codexの結果を承認待ちに保存して」

Claude Codeはリポジトリ直下の `CLAUDE.md` に書かれたルールに従い、
AI_ROUTER.mdの方針でCodexを呼ぶかどうかを判断します。

## 6. Codexを使うべき案件

- コードの実装・修正案の作成
- コードレビュー・セキュリティチェック
- スクリプトの技術検証・テスト観点の洗い出し

## 7. Codexを使わない案件

- 経営判断・人間関係・教育思想に関わる内容
- 文章の執筆・構成・要約(Claude単独で十分)
- 数行で終わる簡単な作業(呼び出しコストのほうが高い)

## 8. ログの確認方法

| 場所 | 内容 |
|---|---|
| `AI_BRIDGE/logs/` | Codex実行の標準出力・標準エラー(秘密情報は自動マスク) |
| `AI_BRIDGE/outputs/` | Codexの回答(`*_codex_answer.md`)と実行結果(`*_codex_result.md/.json`) |
| `AI_BRIDGE/tasks/<ID>/task.md` | タスクカード(人間可読) |
| `AI_BRIDGE/tasks/<ID>/task.json` | タスクの全記録(実行履歴つき) |

## 9. エラー時の対処

1. `python3 AI_BRIDGE/scripts/check_bridge.py` を実行 → ❌の項目を直す
2. よくあるエラー:
   - 「Codex CLIが見つかりません」→ `npm install -g @openai/codex`
   - 「Codex未認証」→ `codex login`(ブラウザでChatGPTアカウント認証)
   - 「タイムアウト」→ `run` に `--timeout 600` を付けて再実行
3. 詳細は `AI_BRIDGE/logs/` の `*_stderr.log` を見る(Claude Codeに「ログを見て原因を調べて」と頼んでもOK)

## 10. 承認方法

1. `AI_BRIDGE/waiting_approval/`(Obsidian設定済みならVaultの `99_waiting_approval/AI_BRIDGE/` にも)のファイルを開いて内容を確認
2. 問題なければ: `python3 run_ai_bridge.py approve AI-20260727-001`
3. やり直しなら: `python3 run_ai_bridge.py reject AI-20260727-001`

## 11. 正式版への移動方法

approveは「記録」だけです。ファイルは**あなたが手動で**正式フォルダへコピー/移動してください
(誤って本番を上書きしない安全設計です)。移動後、frontmatterの `status` はそのままで構いません。

## 12. 停止方法

- 実行中に止めたい: ターミナルで `Ctrl+C`(タイムアウトでも自動停止します)
- 使うのをやめたい: 何もしなくてOK。AI Bridgeは常駐せず、呼ばれたときだけ動きます

## 13. 元に戻す方法

- AI Bridgeは既存ファイルを変更していません。完全に消すには:
  ```bash
  rm -rf AI_BRIDGE
  ```
  と、リポジトリ直下の `CLAUDE.md` からAI Bridgeの節を削除(または `CLAUDE.md` 自体を削除。
  今回CLAUDE.mdは新規作成のため、削除しても他に影響はありません)
- Obsidian側は `99_waiting_approval/AI_BRIDGE/` フォルダを削除するだけです

---

## 設定(config/bridge_config.json)

- `codex.timeout_seconds`: Codexのタイムアウト(既定300秒)
- `codex.model`: モデル指定(nullなら既定モデル)
- `obsidian.vault_root` / `obsidian.waiting_approval_dir`: ローカルPCでObsidianへも保存する場合に設定
- `safety.*`: 外部送信・自動承認は常に無効(変更しないでください)

## 秘密情報の扱い

- APIキーは環境変数または `codex login` の認証情報のみ。**Markdownやconfigに書かない**
- ログ保存時に `sk-...` などのキー形式は自動で `[REDACTED]` にマスクされます
