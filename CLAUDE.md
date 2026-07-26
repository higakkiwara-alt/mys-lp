# CLAUDE.md

このリポジトリでClaude Codeが従うルール。

> 注: このファイルは2026-07-26にAI Bridge導入時に**新規作成**されたものです(既存CLAUDE.mdは存在しなかったため、バックアップは不要でした)。

## プロジェクト概要

- `app/`, `components/`, `lib/` など: Next.js製「AI Salon OS」LP(既存資産。AI Bridge作業では変更しない)
- `AI_BRIDGE/`: Claude Code ⇔ Codex CLI 連携ブリッジ(2026-07-26追加)

---

## AI Bridge 使用ルール(2026-07-26 追記)

ユーザーから次のような依頼を受けたら、AI Bridgeを使うこと:

| ユーザーの言葉 | やること |
|---|---|
| 「これをCodexにもレビューさせて」 | `run_ai_bridge.py new` → `set-codex`(レビュー指示) → `run` |
| 「このコードをCodexで検証して」 | 同上(検証指示をCodexへ) |
| 「Claude案とCodex案を統合して」 | Codexの回答(`tasks/<ID>/codex_answer.md`)を読み、自分の案と統合したMarkdownを作成 → `integrate` |
| 「この案件をAI Bridgeで処理して」 | AI_ROUTER.mdの方針で判断し、必要ならCodexを呼び、統合して `integrate` |
| 「Codexの結果を承認待ちに保存して」 | 統合Markdownを作成し `integrate` で waiting_approval へ |

### 手順(標準フロー)

```bash
cd AI_BRIDGE/scripts
python3 check_bridge.py                                   # 事前チェック
ID=$(python3 run_ai_bridge.py new --title "<タイトル>" --purpose "<目的>" --input <元ファイル...>)
python3 run_ai_bridge.py set-codex $ID --file <Codex指示.md>
python3 run_ai_bridge.py run $ID                          # 回答は tasks/$ID/codex_answer.md
# → Claudeが統合Markdownを作成(一時ファイルでよい)
python3 run_ai_bridge.py integrate $ID --file <統合結果.md>
```

### 厳守事項

1. 役割分担は `AI_BRIDGE/AI_ROUTER.md` に従う(コード・技術検証=Codex、文章・判断・統合=Claude)
2. 簡単な文章作業ではCodexを呼ばない
3. 成果物は必ず `integrate` で waiting_approval へ。**正式ファイルへ直接書き込まない**
4. 元ファイル(入力データ)を変更しない
5. 外部送信(メール・SNS・アップロード)をしない
6. APIキー・トークンをMarkdown・ログ・コミットに残さない
7. Codex失敗時はログ(`AI_BRIDGE/logs/`)を確認して原因を報告する。むやみに再試行しない
8. Codex未認証のときは認証手順(`codex login`)を案内して停止する(勝手に認証情報を作らない)
