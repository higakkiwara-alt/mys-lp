#!/usr/bin/env python3
"""Codex CLIを非対話形式で呼び出す(codex exec)。

使い方:
  python3 send_to_codex.py --prompt-file 指示.md [--task-id AI-...] [--timeout 300]
  echo "指示文" | python3 send_to_codex.py
  python3 send_to_codex.py --prompt-file 指示.md --dry-run   # コマンド確認のみ

動作:
  - 指示文は標準入力経由でCodexへ渡す(コマンドライン長の制限を回避)
  - 標準出力/標準エラーを分離して logs/ に保存(秘密情報はマスク)
  - 最終回答は --output-last-message で確実に回収
  - タイムアウトあり・再試行はネットワーク系エラー時のみ最大 max_retries 回
  - 結果を outputs/ に Markdown と JSON の両方で保存

検証済みCLI仕様(codex-cli 0.145.0 の --help 実出力に基づく):
  codex exec [OPTIONS] [PROMPT]   PROMPTが "-" なら標準入力から読む
  -o/--output-last-message FILE   最終回答をファイルへ
  -s read-only                    サンドボックス(読み取り専用)で安全に実行
"""

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bridge_lib as lib

RETRIABLE_MARKERS = ("timeout", "timed out", "connection", "network", "temporarily", "503", "502", "429")


def build_command(cfg, last_msg_file, codex_command=None, model=None):
    c = cfg["codex"]
    cmd = [codex_command or c["command"], c.get("subcommand", "exec")]
    cmd += c.get("extra_args", [])
    cmd += ["-s", c.get("sandbox", "read-only")]
    if model or c.get("model"):
        cmd += ["-m", model or c["model"]]
    cmd += ["-o", str(last_msg_file), "-"]  # "-" = プロンプトを標準入力から読む
    return cmd


def run_codex(prompt, cfg, run_id, codex_command=None, model=None, timeout=None, dry_run=False):
    """Codexを1回(+必要なら限定的な再試行)実行し、結果dictを返す。"""
    logs_dir = lib.path_of(cfg, "logs")
    outputs_dir = lib.path_of(cfg, "outputs")
    last_msg_file = outputs_dir / f"{run_id}_codex_answer.md"
    timeout = timeout or cfg["codex"].get("timeout_seconds", 300)
    max_retries = cfg["codex"].get("max_retries", 1)
    wait = cfg["codex"].get("retry_wait_seconds", 5)

    cmd = build_command(cfg, last_msg_file, codex_command, model)
    result = {
        "run_id": run_id,
        "command": cmd,
        "started_at": lib.now_iso(),
        "timeout_seconds": timeout,
        "attempts": [],
        "success": False,
        "answer": None,
        "answer_file": None,
        "error": None,
    }

    if dry_run:
        result["error"] = "dry-run(未実行)"
        print("実行予定コマンド:", " ".join(cmd))
        return result

    for attempt in range(1, max_retries + 2):  # 初回 + max_retries回
        t0 = time.time()
        att = {"n": attempt, "started_at": lib.now_iso()}
        try:
            proc = subprocess.run(
                cmd, input=prompt, capture_output=True, text=True, timeout=timeout,
                cwd=str(lib.BRIDGE_ROOT),
            )
            att["exit_code"] = proc.returncode
            att["duration_sec"] = round(time.time() - t0, 1)
            stdout, stderr = proc.stdout or "", proc.stderr or ""
        except subprocess.TimeoutExpired as e:
            att["exit_code"] = None
            att["duration_sec"] = round(time.time() - t0, 1)
            stdout = (e.stdout or b"").decode() if isinstance(e.stdout, bytes) else (e.stdout or "")
            stderr = f"[AI Bridge] {timeout}秒でタイムアウトしました\n" + (
                (e.stderr or b"").decode() if isinstance(e.stderr, bytes) else (e.stderr or "")
            )
        except FileNotFoundError:
            result["error"] = f"Codexコマンドが見つかりません: {cmd[0]}(npm install -g @openai/codex を実行してください)"
            result["attempts"].append(att)
            return result

        # 標準出力/標準エラーを分離してログ保存(マスク済み)
        (logs_dir / f"{run_id}_attempt{attempt}_stdout.log").write_text(lib.redact(stdout), encoding="utf-8")
        (logs_dir / f"{run_id}_attempt{attempt}_stderr.log").write_text(lib.redact(stderr), encoding="utf-8")
        att["stdout_log"] = f"logs/{run_id}_attempt{attempt}_stdout.log"
        att["stderr_log"] = f"logs/{run_id}_attempt{attempt}_stderr.log"
        result["attempts"].append(att)

        if att["exit_code"] == 0 and last_msg_file.exists():
            result["success"] = True
            result["answer"] = last_msg_file.read_text(encoding="utf-8")
            result["answer_file"] = str(last_msg_file)
            break

        err_text = lib.redact(stderr).strip() or "(標準エラー出力なし)"
        result["error"] = err_text[:1000]
        # 認証エラー等は再試行しても無駄なので、ネットワーク系のときだけ再試行する
        retriable = any(m in (stdout + stderr).lower() for m in RETRIABLE_MARKERS)
        if attempt <= max_retries and retriable:
            time.sleep(wait)
            continue
        break

    result["finished_at"] = lib.now_iso()
    _save_result(cfg, run_id, prompt, result)
    return result


def _save_result(cfg, run_id, prompt, result):
    outputs_dir = lib.path_of(cfg, "outputs")
    # JSON(機械可読)— 回答本文はファイル参照、プロンプトは先頭のみ
    jr = dict(result)
    jr["prompt_head"] = lib.redact(prompt[:500])
    jr.pop("answer", None)
    with open(outputs_dir / f"{run_id}_codex_result.json", "w", encoding="utf-8") as f:
        json.dump(jr, f, ensure_ascii=False, indent=2)
    # Markdown(人間可読)
    md = [
        f"# Codex実行結果: {run_id}",
        "",
        f"- 実行日時: {result.get('started_at')} 〜 {result.get('finished_at', '-')}",
        f"- 成功: {'はい' if result['success'] else 'いいえ'}",
        f"- 試行回数: {len(result['attempts'])}",
        f"- エラー: {result.get('error') or 'なし'}",
        "",
        "## Codexの回答",
        "",
        result.get("answer") or "(回答なし)",
    ]
    (outputs_dir / f"{run_id}_codex_result.md").write_text("\n".join(md), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser(description="Codex CLIを非対話形式で呼び出す")
    ap.add_argument("--prompt-file", help="指示文ファイル(省略時は標準入力)")
    ap.add_argument("--task-id", help="Task ID(ログ・出力ファイル名に使用)")
    ap.add_argument("--timeout", type=int, help="タイムアウト秒数")
    ap.add_argument("--model", help="Codexモデル指定")
    ap.add_argument("--codex-command", help="codexコマンドのパス上書き(テスト用)")
    ap.add_argument("--dry-run", action="store_true", help="コマンドを表示するのみで実行しない")
    args = ap.parse_args()

    cfg = lib.load_config()
    if args.prompt_file:
        prompt = Path(args.prompt_file).read_text(encoding="utf-8")
    else:
        prompt = sys.stdin.read()
    if not prompt.strip():
        print("エラー: 指示文が空です", file=sys.stderr)
        sys.exit(2)

    run_id = args.task_id or f"adhoc-{time.strftime('%Y%m%d-%H%M%S')}"
    result = run_codex(prompt, cfg, run_id, codex_command=args.codex_command,
                       model=args.model, timeout=args.timeout, dry_run=args.dry_run)

    if args.dry_run:
        sys.exit(0)
    if result["success"]:
        print(f"成功: 回答は {result['answer_file']} に保存しました")
        sys.exit(0)
    print(f"失敗: {result.get('error')}", file=sys.stderr)
    print("ログ: AI_BRIDGE/logs/ を確認してください", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    main()
