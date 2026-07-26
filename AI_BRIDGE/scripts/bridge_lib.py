#!/usr/bin/env python3
"""AI Bridge 共通ライブラリ。

設定読み込み・Task ID採番・秘密情報のマスキング・タスク保存など、
send_to_codex.py / run_ai_bridge.py / check_bridge.py から共用する処理。
標準ライブラリのみ使用(追加インストール不要)。
"""

import json
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path

# AI_BRIDGE ルート(このファイルは AI_BRIDGE/scripts/ に置かれる前提)
BRIDGE_ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = BRIDGE_ROOT / "config" / "bridge_config.json"

JST = timezone(timedelta(hours=9))

STATUSES = [
    "draft", "ready", "running", "codex_completed", "integration_pending",
    "waiting_approval", "approved", "rejected", "failed",
]

# ログへ書き出す前にマスクする秘密情報パターン
_SECRET_PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9_\-]{16,}"),                      # OpenAI / Anthropic系キー
    re.compile(r"(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}"),      # GitHubトークン
    re.compile(r"github_pat_[A-Za-z0-9_]{20,}"),
    re.compile(r"xox[abprs]-[A-Za-z0-9\-]{10,}"),               # Slackトークン
    re.compile(r"AKIA[0-9A-Z]{16}"),                            # AWSアクセスキー
    re.compile(r"(?i)bearer\s+[A-Za-z0-9._\-]{20,}"),
    re.compile(r"eyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9._\-]{20,}"),  # JWT
]


def now_iso():
    return datetime.now(JST).strftime("%Y-%m-%dT%H:%M:%S%z")


def redact(text):
    """ログ保存前に秘密情報らしき文字列をマスクする。"""
    if not text:
        return text
    for pat in _SECRET_PATTERNS:
        text = pat.sub("[REDACTED]", text)
    return text


def load_config():
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)


def path_of(cfg, key):
    p = BRIDGE_ROOT / cfg["paths"][key]
    p.mkdir(parents=True, exist_ok=True)
    return p


def new_task_id(cfg):
    """AI-YYYYMMDD-NNN 形式のTask IDを採番する(その日の連番)。"""
    today = datetime.now(JST).strftime("%Y%m%d")
    tasks_dir = path_of(cfg, "tasks")
    prefix = f"AI-{today}-"
    seqs = [
        int(d.name[len(prefix):])
        for d in tasks_dir.iterdir()
        if d.is_dir() and d.name.startswith(prefix) and d.name[len(prefix):].isdigit()
    ]
    return f"{prefix}{(max(seqs) + 1) if seqs else 1:03d}"


def task_dir(cfg, task_id):
    return path_of(cfg, "tasks") / task_id


def load_task(cfg, task_id):
    p = task_dir(cfg, task_id) / "task.json"
    if not p.exists():
        raise FileNotFoundError(f"タスクが見つかりません: {task_id} ({p})")
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def save_task(cfg, task):
    d = task_dir(cfg, task["task_id"])
    d.mkdir(parents=True, exist_ok=True)
    task["updated_at"] = now_iso()
    with open(d / "task.json", "w", encoding="utf-8") as f:
        json.dump(task, f, ensure_ascii=False, indent=2)
    return d / "task.json"


def append_history(task, event, detail=""):
    task.setdefault("history", []).append(
        {"at": now_iso(), "event": event, "detail": redact(str(detail))[:2000]}
    )


def set_status(task, status):
    if status not in STATUSES:
        raise ValueError(f"不正なステータス: {status}")
    task["status"] = status


def frontmatter(task, output_type="markdown"):
    """waiting_approval 保存用のYAML frontmatterを生成する。"""
    src = json.dumps(task.get("input_files", []), ensure_ascii=False)
    return "\n".join([
        "---",
        f"task_id: {task['task_id']}",
        f"title: \"{task.get('title', '')}\"",
        f"created_at: {task.get('created_at', '')}",
        f"updated_at: {now_iso()}",
        "created_by: ai_bridge",
        "primary_agent: claude",
        "review_agent: codex",
        "status: waiting_approval",
        f"source_files: {src}",
        f"output_type: {output_type}",
        "approved: false",
        "---",
        "",
    ])


def waiting_approval_dirs(cfg):
    """保存先の承認待ちフォルダ一覧(AI_BRIDGE内+設定されていればObsidian)。"""
    dirs = [path_of(cfg, "waiting_approval")]
    ob = cfg.get("obsidian", {})
    if ob.get("vault_root") and ob.get("waiting_approval_dir"):
        vault = Path(ob["vault_root"]).expanduser()
        if vault.is_dir():
            d = vault / ob["waiting_approval_dir"]
            d.mkdir(parents=True, exist_ok=True)
            dirs.append(d)
    return dirs
