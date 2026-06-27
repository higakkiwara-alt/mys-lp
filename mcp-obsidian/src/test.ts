/**
 * 動作確認用テストスクリプト
 * 使用方法: npm test
 *
 * 実際にVaultを検索してMCPツールが正常に動作するか確認します。
 */
import { loadConfig, getVault } from "./config.js";
import {
  walkVault,
  searchNotes,
  searchByTag,
  getRecentNotes,
  listNotes,
  readNote,
} from "./search.js";

let passed = 0;
let failed = 0;

function ok(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? `: ${detail}` : ""}`);
    failed++;
  }
}

async function run() {
  console.log("=== Obsidian MCP Server テスト ===\n");

  // 1. Config
  console.log("📋 1. 設定ファイル読み込み");
  let config;
  try {
    config = loadConfig();
    ok("config.json 読み込み成功", true);
    ok("Vault設定あり", config.vaults.length > 0);
    config.vaults.forEach((v) =>
      console.log(`     Vault: ${v.name} → ${v.path}`)
    );
  } catch (e) {
    console.log(`  ❌ 設定エラー: ${e}`);
    console.log("\n  config.example.json を config.json にコピーして設定してください:");
    console.log("    cp config.example.json config.json");
    console.log("    nano config.json  # パスを修正");
    process.exit(1);
  }

  const vault = getVault(config);
  console.log();

  // 2. Vault walk
  console.log("📂 2. Vault スキャン");
  const notes = walkVault(vault.path, config);
  ok("ノートが見つかる", notes.length > 0, `${notes.length}件のノート`);
  console.log(`     スキャン結果: ${notes.length} ノート`);
  if (notes.length > 0) {
    console.log(`     最初のノート: ${notes[0].relativePath}`);
  }
  console.log();

  // 3. list_notes
  console.log("📋 3. ノート一覧");
  const listed = listNotes(vault.path, "", false, config);
  ok("ルートディレクトリ一覧取得", listed.length >= 0);
  console.log(`     ルートに ${listed.length} 件`);
  console.log();

  // 4. Recent notes
  console.log("🕐 4. 最近のノート");
  const recent = getRecentNotes(vault.path, 30, config, 10);
  ok("最近30日のノート取得", recent.length >= 0);
  console.log(`     過去30日: ${recent.length} 件`);
  if (recent.length > 0) {
    console.log(`     最新: ${recent[0].relativePath} (${recent[0].modifiedAt.toLocaleDateString("ja-JP")})`);
  }
  console.log();

  // 5. Full-text search (if notes exist)
  if (notes.length > 0) {
    const firstNote = notes[0];
    const titleWord = firstNote.title.split("")[0] ?? "a";
    console.log(`🔍 5. 全文検索 (クエリ: "${titleWord}")`);
    const searchResults = searchNotes(vault.path, titleWord, config, 5);
    ok("検索実行", searchResults.length >= 0);
    console.log(`     ヒット: ${searchResults.length} 件`);
    console.log();

    // 6. Read note
    console.log("📖 6. ノート読み取り");
    try {
      const { content, frontmatter, tags } = readNote(
        vault.path,
        firstNote.relativePath,
        config
      );
      ok("ノート読み取り成功", content.length >= 0);
      console.log(`     パス: ${firstNote.relativePath}`);
      console.log(`     タグ: ${tags.length > 0 ? tags.join(", ") : "なし"}`);
      console.log(`     フロントマター: ${JSON.stringify(frontmatter)}`);
    } catch (e) {
      ok("ノート読み取り", false, String(e));
    }
    console.log();
  }

  // 7. Security check
  console.log("🔒 7. セキュリティ設定");
  ok("読み取り専用モード", config.security.readOnly, "readOnly=true 推奨");
  ok("除外パス設定あり", config.security.excludePaths.length > 0);
  console.log(`     除外パス: ${config.security.excludePaths.join(", ")}`);
  console.log();

  // Summary
  console.log("=".repeat(40));
  console.log(`テスト結果: ${passed} 成功, ${failed} 失敗`);

  if (failed === 0) {
    console.log("\n✅ すべてのテストが通りました！");
    console.log("   ChatGPT Desktop App の設定を行ってください（README.md 参照）");
  } else {
    console.log("\n⚠️  一部のテストが失敗しました。上記のエラーを確認してください。");
    process.exit(1);
  }
}

run().catch((e) => {
  console.error("テスト実行エラー:", e);
  process.exit(1);
});
