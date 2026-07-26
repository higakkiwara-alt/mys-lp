#!/usr/bin/env python3
"""AI Bridge 健全性チェック(doctor)。

使い方: python3 check_bridge.py
変更は一切行わず、環境の状態を ✅/⚠️/❌ で報告する。
致命的な問題(❌)があれば終了コード1。
"""

import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bridge_lib as lib

fatal = False


def ok(msg):
    print(f"  ✅ {msg}")


def warn(msg):
    print(f"  ⚠️  {msg}")


def bad(msg):
    global fatal
    fatal = True
    print(f"  ❌ {msg}")


def main():
    print("AI Bridge 健全性チェック")
    print(f"  ルート: {lib.BRIDGE_ROOT}")

    # Python
    v = sys.version_info
    (ok if v >= (3, 8) else bad)(f"Python {v.major}.{v.minor}.{v.micro}")

    # 設定ファイル
    try:
        cfg = lib.load_config()
        ok(f"設定ファイル読み込みOK: {lib.CONFIG_PATH.relative_to(lib.BRIDGE_ROOT)}")
    except Exception as e:
        bad(f"設定ファイルが読めません: {e}")
        return finish()

    # フォルダ
    for key in ("inbox", "tasks", "outputs", "logs", "waiting_approval"):
        p = lib.BRIDGE_ROOT / cfg["paths"][key]
        if p.is_dir():
            ok(f"フォルダあり: {cfg['paths'][key]}/")
        else:
            warn(f"フォルダなし(初回実行時に自動作成): {cfg['paths'][key]}/")

    # Codex CLI
    codex = shutil.which(cfg["codex"]["command"])
    if not codex:
        bad("Codex CLIが見つかりません → npm install -g @openai/codex")
        return finish()
    try:
        ver = subprocess.run([codex, "--version"], capture_output=True, text=True, timeout=30)
        ok(f"Codex CLI: {ver.stdout.strip() or codex}")
    except Exception as e:
        bad(f"codex --version が失敗: {e}")
        return finish()

    # Codex認証
    try:
        st = subprocess.run([codex, "login", "status"], capture_output=True, text=True, timeout=30)
        status_text = (st.stdout + st.stderr).strip()
        if st.returncode == 0:
            ok(f"Codex認証済み: {lib.redact(status_text)}")
        else:
            bad("Codex未認証です。以下のいずれかで認証してください:")
            print("       方法1(ChatGPTアカウント): codex login")
            print("       方法2(APIキー):          printenv OPENAI_API_KEY | codex login --with-api-key")
            print("       ※APIキーをファイルやMarkdownに書かないでください")
    except Exception as e:
        bad(f"codex login status が失敗: {e}")

    # Obsidian設定
    ob = cfg.get("obsidian", {})
    if ob.get("vault_root"):
        vault = Path(ob["vault_root"]).expanduser()
        if vault.is_dir():
            ok(f"Obsidian Vault: {vault}")
        else:
            warn(f"Obsidian Vaultのパスが存在しません: {vault}(このマシンでは未使用?)")
    else:
        warn("Obsidian Vault未設定(config/bridge_config.json の obsidian.vault_root)。"
             "AI_BRIDGE/waiting_approval のみ使用します")

    # 安全設定
    s = cfg.get("safety", {})
    (ok if not s.get("allow_external_send") else bad)("外部送信: 無効(安全)")
    (ok if not s.get("auto_approve") else bad)("自動承認: 無効(安全)")

    finish()


def finish():
    print()
    if fatal:
        print("結果: ❌ 致命的な問題があります。上記を解決してから実行してください。")
        sys.exit(1)
    print("結果: ✅ AI Bridgeは実行可能な状態です。")
    sys.exit(0)


if __name__ == "__main__":
    main()
