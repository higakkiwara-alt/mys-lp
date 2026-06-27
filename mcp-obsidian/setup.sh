#!/usr/bin/env bash
# Obsidian MCP Server セットアップスクリプト
# 使用方法: bash setup.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Obsidian MCP Server セットアップ ==="
echo ""

# 1. Node.js バージョン確認
echo "▶ Node.js バージョン確認..."
if ! command -v node &>/dev/null; then
  echo "❌ Node.js がインストールされていません。"
  echo "   https://nodejs.org/ から LTS版をインストールしてください。"
  echo "   または: brew install node"
  exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18以上が必要です（現在: $(node --version)）"
  echo "   brew upgrade node"
  exit 1
fi
echo "   ✅ Node.js $(node --version)"

# 2. npm install
echo ""
echo "▶ 依存パッケージをインストール中..."
npm install --silent
echo "   ✅ パッケージインストール完了"

# 3. ビルド
echo ""
echo "▶ TypeScript ビルド中..."
npm run build
echo "   ✅ ビルド完了 (dist/index.js)"

# 4. config.json 確認
echo ""
echo "▶ 設定ファイル確認..."
if [ ! -f config.json ]; then
  echo "   ⚠️  config.json が見つかりません。"
  echo "   config.example.json をコピーして編集してください:"
  echo ""
  echo "   cp config.example.json config.json"
  echo "   open config.json"
  echo ""
  echo "   ObsidianのVaultパスを設定する必要があります。"
  echo "   通常のiCloud同期の場合:"
  echo "   ~/Library/Mobile Documents/iCloud~md~obsidian/Documents/[VaultName]"
  echo ""
  read -rp "今すぐ config.json を作成しますか? [Y/n] " yn
  if [[ "${yn:-Y}" =~ ^[Yy]$ ]]; then
    cp config.example.json config.json
    # Vault名とパスを推測
    ICLOUD_OBSIDIAN="$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents"
    if [ -d "$ICLOUD_OBSIDIAN" ]; then
      FIRST_VAULT=$(ls "$ICLOUD_OBSIDIAN" | head -1)
      if [ -n "$FIRST_VAULT" ]; then
        VAULT_PATH="$ICLOUD_OBSIDIAN/$FIRST_VAULT"
        echo "   Obsidian Vault を自動検出しました: $VAULT_PATH"
        # macOS sed でパスを置換 (-i '' はmacOS用)
        sed -i '' "s|/Users/YOUR_USERNAME/Library/Mobile Documents/iCloud~md~obsidian/Documents/YOUR_VAULT_NAME|$VAULT_PATH|g" config.json
        sed -i '' "s|\"name\": \"main\"|\"name\": \"main\"|g" config.json
        echo "   ✅ config.json に自動設定しました"
      fi
    fi
    echo ""
    echo "   config.json を開いてパスを確認してください:"
    echo "   open config.json"
  fi
else
  echo "   ✅ config.json 存在"
fi

# 5. 動作テスト
echo ""
echo "▶ 動作テスト実行中..."
if [ -f config.json ]; then
  if npm test 2>&1; then
    echo ""
    echo "✅ テスト完了"
  else
    echo ""
    echo "⚠️  テストが失敗しました。config.json のパスを確認してください。"
    exit 1
  fi
else
  echo "   ⚠️  config.json がないためテストをスキップ"
fi

# 6. ChatGPT Desktop 設定
echo ""
echo "=== ChatGPT Desktop App への設定 ==="
echo ""

MCP_SERVER_PATH="$(pwd)/dist/index.js"
NODE_PATH="$(which node)"

echo "📋 以下の設定を ChatGPT Desktop App に追加してください:"
echo ""
echo "【方法1】ChatGPT Desktop App のGUI設定"
echo "  1. ChatGPT Desktop App を開く"
echo "  2. 設定 (Settings) > Developer > MCP Servers"
echo "  3. 新規サーバーを追加:"
echo "     - 名前: Obsidian"
echo "     - コマンド: $NODE_PATH"
echo "     - 引数: $MCP_SERVER_PATH"
echo ""
echo "【方法2】設定ファイルに直接追記"
echo ""
CHATGPT_CONFIG="$HOME/Library/Application Support/OpenAI/ChatGPT/mcp_servers.json"
echo "  設定ファイル: $CHATGPT_CONFIG"
echo ""
echo '  {
    "mcpServers": {
      "obsidian": {
        "command": "'"$NODE_PATH"'",
        "args": ["'"$MCP_SERVER_PATH"'"]
      }
    }
  }'
echo ""

# 自動設定を試みる
CHATGPT_CONFIG_DIR="$HOME/Library/Application Support/OpenAI/ChatGPT"
if [ -d "$CHATGPT_CONFIG_DIR" ]; then
  echo "   ChatGPT設定ディレクトリを検出しました。"
  read -rp "   設定ファイルを自動生成しますか? [Y/n] " yn2
  if [[ "${yn2:-Y}" =~ ^[Yy]$ ]]; then
    cat > "$CHATGPT_CONFIG_DIR/mcp_servers.json" <<EOF
{
  "mcpServers": {
    "obsidian": {
      "command": "$NODE_PATH",
      "args": ["$MCP_SERVER_PATH"]
    }
  }
}
EOF
    echo "   ✅ $CHATGPT_CONFIG_DIR/mcp_servers.json を作成しました"
    echo "   ChatGPT Desktop App を再起動してください。"
  fi
fi

echo ""
echo "=== セットアップ完了 ==="
echo ""
echo "次のステップ:"
echo "  1. ChatGPT Desktop App を再起動"
echo "  2. チャットで試す:"
echo '     「今日の議事録を探して」'
echo '     「採用 というキーワードで検索して」'
echo '     「最近更新されたノートを教えて」'
echo ""
