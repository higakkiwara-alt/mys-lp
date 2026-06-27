# Obsidian MCP Server

ChatGPT から Obsidian Vault を検索・読み取りできる MCP Server です。  
Docker 不要、Mac ローカルで動作、セキュリティ重視の設計です。

---

## 機能

| ツール | 説明 | 例 |
|--------|------|----|
| `search_notes` | キーワードで全文検索 | 「採用メモを探して」 |
| `read_note` | ノートの内容を読み取り | 「会社ルール.md を見せて」 |
| `list_notes` | フォルダのノート一覧 | 「Inbox の一覧を出して」 |
| `search_by_tag` | タグで検索 | 「#議事録 のノートを探して」 |
| `get_recent_notes` | 最近更新されたノート一覧 | 「最近のメモを出して」 |
| `list_vaults` | 利用可能なVault一覧 | 複数Vault確認 |
| `write_note` | ノートを作成・更新 ※要設定 | 新規メモ作成 |

---

## 動作環境

- macOS（Monterey 以降推奨）
- Node.js 18 以上
- ChatGPT Desktop App（MCP対応版）
- Obsidian（起動不要、ファイルシステム直接アクセス）

---

## セットアップ

### ステップ 1: Node.js のインストール確認

```bash
node --version  # v18.0.0 以上であること
```

なければ [nodejs.org](https://nodejs.org/) から LTS 版をインストール、または:

```bash
brew install node
```

### ステップ 2: このリポジトリを取得

```bash
git clone https://github.com/higakkiwara-alt/mys-lp.git
cd mys-lp/mcp-obsidian
```

### ステップ 3: セットアップスクリプトを実行

```bash
bash setup.sh
```

スクリプトが以下を自動実行します:
1. 依存パッケージのインストール
2. TypeScript ビルド
3. Obsidian Vault の自動検出（iCloud同期の場合）
4. `config.json` の作成
5. ChatGPT Desktop App への設定生成

### ステップ 4: config.json を手動確認

```bash
nano config.json
```

```json
{
  "vaults": [
    {
      "name": "main",
      "path": "/Users/あなたのユーザー名/Library/Mobile Documents/iCloud~md~obsidian/Documents/あなたのVault名",
      "description": "メインVault"
    }
  ],
  "security": {
    "readOnly": true,
    "excludePaths": [".obsidian", ".git", ".trash", "Private"],
    "maxResults": 50,
    "maxFileSize": 1048576,
    "allowedExtensions": [".md", ".txt", ".canvas"]
  },
  "search": {
    "caseSensitive": false,
    "maxDepth": 10,
    "contextLines": 3
  }
}
```

**Vaultパスの確認方法:**  
Obsidian → 設定（歯車）→ ファイルとリンク → Vaultの場所 で確認できます。

### ステップ 5: 動作テスト

```bash
npm test
```

全テスト ✅ なら正常に動作しています。

### ステップ 6: ChatGPT Desktop App に設定を追加

#### 方法A: GUIで設定（推奨）

1. ChatGPT Desktop App を開く
2. メニュー → Settings → Developer → MCP Servers
3. 「Add Server」をクリック
4. 以下を入力:
   - **名前**: `Obsidian`
   - **Command**: `node`（またはフルパス: `/usr/local/bin/node`）
   - **Arguments**: `/Users/あなた/path/to/mys-lp/mcp-obsidian/dist/index.js`

#### 方法B: 設定ファイルに直接記入

設定ファイルの場所:
```
~/Library/Application Support/OpenAI/ChatGPT/mcp_servers.json
```

内容（新規作成または追記）:
```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": ["/Users/あなた/path/to/mys-lp/mcp-obsidian/dist/index.js"]
    }
  }
}
```

パスの確認:
```bash
echo "$(pwd)/dist/index.js"
```

### ステップ 7: ChatGPT を再起動して確認

ChatGPT Desktop App を完全に終了して再起動してください。  
チャット画面に「🔧 Obsidian」ツールが表示されれば成功です。

---

## 使用例

ChatGPT に話しかける:

```
今日の議事録を探して
```
```
採用というキーワードでノートを検索して
```
```
前回の会社ルールのメモを出して
```
```
#人物 タグのノートを全部教えて
```
```
最近1週間で更新したノートは何がある？
```
```
Inbox フォルダのノート一覧を見せて
```

---

## 複数 Vault の設定

`config.json` に複数のVaultを追加できます:

```json
{
  "vaults": [
    {
      "name": "work",
      "path": "/Users/you/Obsidian/Work",
      "description": "仕事用Vault"
    },
    {
      "name": "personal",
      "path": "/Users/you/Obsidian/Personal",
      "description": "個人Vault"
    }
  ]
}
```

ChatGPT からは:
```
仕事用Vaultで採用メモを検索して
```
```
personalのVaultで旅行メモを探して
```

---

## セキュリティ設計

### 読み取り専用モード（デフォルト）

`config.json` の `readOnly: true` が有効な間、書き込み操作は一切できません。

書き込みを許可する場合:
```json
"security": {
  "readOnly": false
}
```

### アクセス除外パス

プライベートなフォルダを `excludePaths` に追加:

```json
"excludePaths": [".obsidian", ".git", ".trash", "Private", "日記"]
```

### パストラバーサル防止

Vault の外部ディレクトリへのアクセスはサーバー側で自動的に拒否されます。

### Claude Code との共存

このMCPサーバーは読み取り専用（デフォルト）のため、Claude Code による書き込みと競合しません。  
書き込みを有効にする場合は、同じファイルへの同時書き込みを避けるため運用ルールを決めてください。

### GitHub 同期との共存

MCPサーバーは `.git` フォルダを自動除外するため、Git の状態に影響しません。  
Obsidian → GitHub 自動同期が10分毎に動作している場合も問題なく動作します。

---

## トラブルシューティング

### 「設定ファイルが見つかりません」エラー

```bash
cp config.example.json config.json
nano config.json  # パスを修正
```

### 「Vaultパスが存在しません」エラー

Vault のパスを確認:
```bash
ls ~/Library/Mobile\ Documents/iCloud\~md\~obsidian/Documents/
```

### ChatGPT が Obsidian ツールを認識しない

1. `dist/index.js` が存在するか確認: `ls dist/`
2. Node.js のフルパスを使う: `which node` → `/usr/local/bin/node`
3. ChatGPT Desktop App を完全に終了して再起動
4. MCP設定ファイルのパスに空白が含まれないか確認

### 検索結果が出ない

```bash
npm test  # Vault走査が正常か確認
```

ログ確認:
```bash
node dist/index.js 2>&1  # 起動エラーを確認
```

---

## 更新方法

```bash
cd mys-lp
git pull origin main
cd mcp-obsidian
npm run build
```

ChatGPT Desktop App の再起動は不要です（次回のMCP呼び出し時に自動的に新しいバイナリが使われます）。

---

## ライセンス

MIT
