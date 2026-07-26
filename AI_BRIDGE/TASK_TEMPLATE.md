# AI TASK

## Task ID
(例: AI-20260727-001 — run_ai_bridge.py new が自動採番します)

## Title
(タスクの短い名前)

## Purpose
(何のためにやるか。1〜3行)

## Background
(経緯・前提。なくてもよい)

## Input Files
- (元データのパス。元ファイルは変更されず、タスクフォルダへコピー保全されます)

## Requested Deliverables
- (最終的に欲しい成果物。例: レビューコメントMarkdown、修正済みコード案)

## Claude Instructions
(Claudeが担当する部分への指示。統合方針・文章トーンなど)

## Codex Instructions
(Codexへ渡す指示。技術検証・コードレビューなど。ここが空ならCodexは呼ばれません)

## Constraints
- 元ファイルを変更しない
- 外部送信禁止(メール・SNS・アップロード禁止)
- APIキー・秘密情報を成果物やログへ書かない
- 成果物は必ず waiting_approval へ保存する

## Destination
(承認後の正式保存先。移動は人間が手動で行う)

## Approval Status
draft
(draft → ready → running → codex_completed → integration_pending → waiting_approval → approved / rejected / failed)

## Execution Log
- (実行履歴が自動追記されます)
