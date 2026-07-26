#!/usr/bin/env python3
"""AI Bridge タスク管理CLI。

使い方:
  python3 run_ai_bridge.py new --title "タイトル" [--purpose "目的"] [--input FILE ...]
  python3 run_ai_bridge.py set-codex <TASK_ID> --file 指示.md      # Codexへの指示を登録
  python3 run_ai_bridge.py run <TASK_ID> [--timeout N]             # Codexを実行し回答を回収
  python3 run_ai_bridge.py integrate <TASK_ID> --file 統合結果.md   # 統合結果をwaiting_approvalへ保存
  python3 run_ai_bridge.py status [TASK_ID]                        # 状態確認
  python3 run_ai_bridge.py approve <TASK_ID> / reject <TASK_ID>    # 承認/却下(記録のみ)

安全設計:
  - 元ファイル(inbox/やInput Files)は一切変更しない
  - 成果物は必ず waiting_approval に置く(正式フォルダへの自動反映はしない)
  - approveしてもファイルの移動は行わない(移動は人間が手動で行う)
"""

import argparse
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bridge_lib as lib
import send_to_codex


def cmd_new(args, cfg):
    task_id = lib.new_task_id(cfg)
    task = {
        "task_id": task_id,
        "title": args.title,
        "purpose": args.purpose or "",
        "created_at": lib.now_iso(),
        "updated_at": lib.now_iso(),
        "input_files": args.input or [],
        "claude_instructions": args.claude or "",
        "codex_instructions": "",
        "codex_answer_file": None,
        "pre_integration_note": "",
        "final_output_files": [],
        "status": "draft",
        "destination": "",
        "error": None,
        "history": [],
    }
    lib.append_history(task, "created", f"title={args.title}")
    d = lib.task_dir(cfg, task_id)
    d.mkdir(parents=True, exist_ok=True)
    # 元データはコピーで保全(元ファイルは動かさない)
    for f in task["input_files"]:
        src = Path(f)
        if src.exists():
            (d / "inputs").mkdir(exist_ok=True)
            shutil.copy2(src, d / "inputs" / src.name)
    _write_task_md(cfg, task)
    lib.save_task(cfg, task)
    print(task_id)


def cmd_set_codex(args, cfg):
    task = lib.load_task(cfg, args.task_id)
    text = Path(args.file).read_text(encoding="utf-8") if args.file else (args.text or "")
    if not text.strip():
        sys.exit("エラー: Codexへの指示が空です(--file か --text を指定)")
    task["codex_instructions"] = text
    lib.set_status(task, "ready")
    lib.append_history(task, "codex_instructions_set", f"{len(text)}文字")
    _write_task_md(cfg, task)
    lib.save_task(cfg, task)
    print(f"{args.task_id}: ready(run可能)")


def cmd_run(args, cfg):
    task = lib.load_task(cfg, args.task_id)
    if not task.get("codex_instructions", "").strip():
        sys.exit(f"エラー: {args.task_id} にCodexへの指示がありません(set-codexで登録してください)")
    lib.set_status(task, "running")
    lib.append_history(task, "codex_run_started")
    lib.save_task(cfg, task)

    result = send_to_codex.run_codex(
        task["codex_instructions"], cfg, task["task_id"],
        codex_command=args.codex_command, timeout=args.timeout,
    )
    if result["success"]:
        task["codex_answer_file"] = result["answer_file"]
        # タスクフォルダにも回答を保存
        d = lib.task_dir(cfg, task["task_id"])
        (d / "codex_answer.md").write_text(result["answer"], encoding="utf-8")
        lib.set_status(task, "codex_completed")
        lib.append_history(task, "codex_completed", f"answer={result['answer_file']}")
        task["error"] = None
        print(f"{task['task_id']}: codex_completed。回答: {d / 'codex_answer.md'}")
    else:
        lib.set_status(task, "failed")
        task["error"] = result.get("error")
        lib.append_history(task, "codex_failed", result.get("error") or "")
        print(f"{task['task_id']}: failed — {result.get('error')}", file=sys.stderr)
    _write_task_md(cfg, task)
    lib.save_task(cfg, task)
    sys.exit(0 if result["success"] else 1)


def cmd_integrate(args, cfg):
    task = lib.load_task(cfg, args.task_id)
    body = Path(args.file).read_text(encoding="utf-8")
    slug = "".join(c if c.isalnum() or c in "-_" else "_" for c in task.get("title", ""))[:40] or "output"
    fname = f"{task['task_id']}_{slug}.md"
    content = lib.frontmatter(task, output_type=args.output_type) + body
    saved = []
    for d in lib.waiting_approval_dirs(cfg):
        out = d / fname
        if out.exists() and not args.force:
            sys.exit(f"エラー: {out} は既に存在します(--force で上書き可)")
        out.write_text(content, encoding="utf-8")
        saved.append(str(out))
    task["final_output_files"] = saved
    task["destination"] = saved[0] if saved else ""
    lib.set_status(task, "waiting_approval")
    lib.append_history(task, "moved_to_waiting_approval", "; ".join(saved))
    _write_task_md(cfg, task)
    lib.save_task(cfg, task)
    print("waiting_approval へ保存しました:")
    for s in saved:
        print(f"  {s}")


def cmd_status(args, cfg):
    tasks_dir = lib.path_of(cfg, "tasks")
    ids = [args.task_id] if args.task_id else sorted(
        d.name for d in tasks_dir.iterdir() if d.is_dir() and (d / "task.json").exists()
    )
    if not ids:
        print("タスクはまだありません")
        return
    for tid in ids:
        t = lib.load_task(cfg, tid)
        err = ""
        if t.get("error"):
            # エラーは要約1行のみ表示(全文は task.json / logs/ 参照)
            lines = [l for l in str(t["error"]).splitlines() if l.strip()]
            key = next((l for l in lines if "ERROR" in l or "error" in l.lower()), lines[0] if lines else "")
            err = f"  エラー: {key.strip()[:100]}"
        print(f"{t['task_id']}  [{t['status']:<18}] {t.get('title','')}{err}")
        if args.task_id:
            for h in t.get("history", []):
                print(f"    {h['at']}  {h['event']}  {h['detail'][:80]}")


def cmd_approve(args, cfg, approved=True):
    task = lib.load_task(cfg, args.task_id)
    lib.set_status(task, "approved" if approved else "rejected")
    lib.append_history(task, "approved" if approved else "rejected", "手動操作")
    # waiting_approval内のファイルのfrontmatterも更新
    for f in task.get("final_output_files", []):
        p = Path(f)
        if p.exists():
            txt = p.read_text(encoding="utf-8")
            txt = txt.replace("status: waiting_approval", f"status: {task['status']}", 1)
            if approved:
                txt = txt.replace("approved: false", "approved: true", 1)
            p.write_text(txt, encoding="utf-8")
    _write_task_md(cfg, task)
    lib.save_task(cfg, task)
    if approved:
        print(f"{args.task_id}: approved(ファイルの正式フォルダへの移動は手動で行ってください)")
    else:
        print(f"{args.task_id}: rejected")


def _write_task_md(cfg, task):
    """TASK_TEMPLATE.md の形式で人間可読なタスクカードを書き出す。"""
    d = lib.task_dir(cfg, task["task_id"])
    d.mkdir(parents=True, exist_ok=True)
    hist = "\n".join(f"- {h['at']} {h['event']} {h['detail']}" for h in task.get("history", []))
    md = f"""# AI TASK

## Task ID
{task['task_id']}

## Title
{task.get('title', '')}

## Purpose
{task.get('purpose', '')}

## Background
作成日時: {task.get('created_at', '')} / 最終更新: {task.get('updated_at', '')}

## Input Files
{chr(10).join('- ' + f for f in task.get('input_files', [])) or '- (なし)'}

## Requested Deliverables
(integrate時にwaiting_approvalへ保存)

## Claude Instructions
{task.get('claude_instructions', '') or '(未設定)'}

## Codex Instructions
{task.get('codex_instructions', '') or '(未設定)'}

## Constraints
- 元ファイルを変更しない / 外部送信禁止 / 秘密情報をログへ残さない

## Destination
{task.get('destination', '') or '(未定・waiting_approval経由)'}

## Approval Status
{task.get('status', 'draft')}

## Execution Log
{hist or '- (なし)'}
"""
    (d / "task.md").write_text(md, encoding="utf-8")


def main():
    ap = argparse.ArgumentParser(description="AI Bridge タスク管理")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("new", help="新規タスク作成")
    p.add_argument("--title", required=True)
    p.add_argument("--purpose")
    p.add_argument("--claude", help="Claude側の指示メモ")
    p.add_argument("--input", nargs="*", help="元データファイル(コピーして保全)")

    p = sub.add_parser("set-codex", help="Codexへの指示を登録")
    p.add_argument("task_id")
    p.add_argument("--file")
    p.add_argument("--text")

    p = sub.add_parser("run", help="Codexを実行")
    p.add_argument("task_id")
    p.add_argument("--timeout", type=int)
    p.add_argument("--codex-command", help="codexコマンドのパス上書き(テスト用)")

    p = sub.add_parser("integrate", help="統合結果をwaiting_approvalへ保存")
    p.add_argument("task_id")
    p.add_argument("--file", required=True, help="Claudeが統合した最終Markdown")
    p.add_argument("--output-type", default="markdown")
    p.add_argument("--force", action="store_true")

    p = sub.add_parser("status", help="状態確認")
    p.add_argument("task_id", nargs="?")

    p = sub.add_parser("approve", help="承認(記録のみ・移動はしない)")
    p.add_argument("task_id")
    p = sub.add_parser("reject", help="却下")
    p.add_argument("task_id")

    args = ap.parse_args()
    cfg = lib.load_config()
    if args.cmd == "new":
        cmd_new(args, cfg)
    elif args.cmd == "set-codex":
        cmd_set_codex(args, cfg)
    elif args.cmd == "run":
        cmd_run(args, cfg)
    elif args.cmd == "integrate":
        cmd_integrate(args, cfg)
    elif args.cmd == "status":
        cmd_status(args, cfg)
    elif args.cmd == "approve":
        cmd_approve(args, cfg, approved=True)
    elif args.cmd == "reject":
        cmd_approve(args, cfg, approved=False)


if __name__ == "__main__":
    main()
