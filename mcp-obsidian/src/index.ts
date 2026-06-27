#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import * as path from "path";

import { loadConfig, getVault } from "./config.js";
import {
  searchNotes,
  searchByTag,
  getRecentNotes,
  listNotes,
  readNote,
  writeNote,
} from "./search.js";

const config = loadConfig();
const vaultNames = config.vaults.map((v) => v.name).join(", ");

const server = new Server(
  { name: "obsidian-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ── Tool definitions ────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
  type ToolDef = {
    name: string;
    description: string;
    inputSchema: {
      type: "object";
      properties: Record<string, { type: string; description: string }>;
      required: string[];
    };
  };
  const tools: ToolDef[] = [
    {
      name: "search_notes",
      description:
        `Obsidian Vaultをキーワードで全文検索します。` +
        `会議録・採用メモ・社内ルール・人物情報など何でも検索できます。` +
        `利用可能なVault: ${vaultNames}`,
      inputSchema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "検索キーワード（日本語・英語両対応）",
          },
          vault: {
            type: "string",
            description: `検索するVault名（省略時: ${config.vaults[0].name}）`,
          },
          limit: {
            type: "number",
            description: "最大結果数（デフォルト: 20）",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "read_note",
      description: "指定したパスまたはタイトルのObsidianノートを読み取ります。",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: {
            type: "string",
            description: "ノートのパスまたはファイル名（例: Inbox/2024-01-15.md）",
          },
          vault: {
            type: "string",
            description: "Vault名（省略時はデフォルト）",
          },
        },
        required: ["path"],
      },
    },
    {
      name: "list_notes",
      description: "Obsidianのフォルダ内のノート一覧を取得します。",
      inputSchema: {
        type: "object" as const,
        properties: {
          directory: {
            type: "string",
            description: "フォルダパス（省略時はVaultルート）",
          },
          vault: {
            type: "string",
            description: "Vault名（省略時はデフォルト）",
          },
          recursive: {
            type: "boolean",
            description: "サブフォルダも含める（デフォルト: false）",
          },
        },
        required: [],
      },
    },
    {
      name: "search_by_tag",
      description:
        "タグでObsidianノートを検索します。#採用 #会議 #人物 など。",
      inputSchema: {
        type: "object" as const,
        properties: {
          tag: {
            type: "string",
            description: "検索するタグ（# なしでもOK）",
          },
          vault: {
            type: "string",
            description: "Vault名（省略時はデフォルト）",
          },
        },
        required: ["tag"],
      },
    },
    {
      name: "get_recent_notes",
      description: "最近更新されたObsidianノートを一覧します。",
      inputSchema: {
        type: "object" as const,
        properties: {
          days: {
            type: "number",
            description: "何日以内のノートを取得するか（デフォルト: 7）",
          },
          vault: {
            type: "string",
            description: "Vault名（省略時はデフォルト）",
          },
          limit: {
            type: "number",
            description: "最大結果数（デフォルト: 20）",
          },
        },
        required: [],
      },
    },
    {
      name: "list_vaults",
      description: "設定済みのObsidian Vault一覧を返します。",
      inputSchema: {
        type: "object" as const,
        properties: {},
        required: [],
      },
    },
  ];

  if (!config.security.readOnly) {
    tools.push({
      name: "write_note",
      description:
        "Obsidianノートを作成または更新します（書き込みモードが有効な場合のみ）。",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: {
            type: "string",
            description: "ノートのパス（例: Inbox/新規メモ.md）",
          },
          content: {
            type: "string",
            description: "ノートの内容（Markdown形式）",
          },
          vault: {
            type: "string",
            description: "Vault名（省略時はデフォルト）",
          },
        },
        required: ["path", "content"],
      },
    });
  }

  return { tools };
});

// ── Tool handlers ────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case "list_vaults": {
        const vaultList = config.vaults.map((v) => ({
          name: v.name,
          description: v.description ?? "",
          path: v.path,
        }));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ vaults: vaultList }, null, 2),
            },
          ],
        };
      }

      case "search_notes": {
        const query = String(args.query ?? "");
        if (!query.trim()) throw new McpError(ErrorCode.InvalidParams, "query は必須です");

        const vault = getVault(config, args.vault as string | undefined);
        const limit = Number(args.limit ?? 20);
        const results = searchNotes(vault.path, query, config, limit);

        if (results.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `「${query}」に一致するノートが見つかりませんでした。`,
              },
            ],
          };
        }

        const formatted = results.map((r) => {
          const dateStr = r.note.modifiedAt.toLocaleDateString("ja-JP");
          const tags = r.tags.length > 0 ? `タグ: ${r.tags.join(", ")} | ` : "";
          const excerpts =
            r.excerpts.length > 0
              ? `\n\n抜粋:\n${r.excerpts.map((e) => `  > ${e.replace(/\n/g, "\n  > ")}`).join("\n\n")}`
              : "";
          return `📄 **${r.note.title}**\nパス: ${r.note.relativePath} | ${tags}更新: ${dateStr}${excerpts}`;
        });

        return {
          content: [
            {
              type: "text",
              text:
                `「${query}」の検索結果 (${results.length}件, Vault: ${vault.name}):\n\n` +
                formatted.join("\n\n---\n\n"),
            },
          ],
        };
      }

      case "read_note": {
        const notePath = String(args.path ?? "");
        if (!notePath.trim()) throw new McpError(ErrorCode.InvalidParams, "path は必須です");

        const vault = getVault(config, args.vault as string | undefined);
        const { content, frontmatter, tags } = readNote(vault.path, notePath, config);

        const meta: string[] = [];
        if (Object.keys(frontmatter).length > 0) {
          meta.push(`---\n${Object.entries(frontmatter).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join("\n")}\n---`);
        }
        if (tags.length > 0) {
          meta.push(`タグ: ${tags.join(", ")}`);
        }

        return {
          content: [
            {
              type: "text",
              text: [meta.join("\n"), content].filter(Boolean).join("\n\n"),
            },
          ],
        };
      }

      case "list_notes": {
        const vault = getVault(config, args.vault as string | undefined);
        const directory = String(args.directory ?? "");
        const recursive = Boolean(args.recursive ?? false);
        const notes = listNotes(vault.path, directory, recursive, config);

        if (notes.length === 0) {
          return {
            content: [{ type: "text", text: "ノートが見つかりませんでした。" }],
          };
        }

        const header = directory
          ? `📂 ${directory} (${vault.name}):`
          : `📂 Vault ルート (${vault.name}):`;
        const lines = notes.map(
          (n) =>
            `  - ${n.relativePath} (${n.modifiedAt.toLocaleDateString("ja-JP")})`
        );

        return {
          content: [
            {
              type: "text",
              text: `${header}\n${lines.join("\n")}`,
            },
          ],
        };
      }

      case "search_by_tag": {
        const tag = String(args.tag ?? "");
        if (!tag.trim()) throw new McpError(ErrorCode.InvalidParams, "tag は必須です");

        const vault = getVault(config, args.vault as string | undefined);
        const results = searchByTag(vault.path, tag, config);

        if (results.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `タグ「#${tag.replace(/^#/, "")}」を持つノートが見つかりませんでした。`,
              },
            ],
          };
        }

        const formatted = results.map(
          (r) =>
            `📄 **${r.note.title}**\nパス: ${r.note.relativePath} | 更新: ${r.note.modifiedAt.toLocaleDateString("ja-JP")}\nタグ: ${r.tags.join(", ")}`
        );

        return {
          content: [
            {
              type: "text",
              text:
                `タグ「#${tag.replace(/^#/, "")}」の検索結果 (${results.length}件):\n\n` +
                formatted.join("\n\n---\n\n"),
            },
          ],
        };
      }

      case "get_recent_notes": {
        const vault = getVault(config, args.vault as string | undefined);
        const days = Number(args.days ?? 7);
        const limit = Number(args.limit ?? 20);
        const notes = getRecentNotes(vault.path, days, config, limit);

        if (notes.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `過去${days}日以内に更新されたノートはありません。`,
              },
            ],
          };
        }

        const lines = notes.map(
          (n) =>
            `  - ${n.relativePath} (${n.modifiedAt.toLocaleString("ja-JP")})`
        );

        return {
          content: [
            {
              type: "text",
              text:
                `最近更新されたノート (過去${days}日, ${notes.length}件, Vault: ${vault.name}):\n\n` +
                lines.join("\n"),
            },
          ],
        };
      }

      case "write_note": {
        if (config.security.readOnly) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            "読み取り専用モードです。config.json の readOnly を false に変更してください。"
          );
        }
        const notePath = String(args.path ?? "");
        const content = String(args.content ?? "");
        if (!notePath.trim()) throw new McpError(ErrorCode.InvalidParams, "path は必須です");

        const vault = getVault(config, args.vault as string | undefined);
        writeNote(vault.path, notePath, content, config);

        return {
          content: [
            {
              type: "text",
              text: `✅ ノートを保存しました: ${notePath} (Vault: ${vault.name})`,
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `不明なツール: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError(
      ErrorCode.InternalError,
      `エラー: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// ── Start ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(
    `Obsidian MCP Server 起動完了 (Vaults: ${vaultNames})\n`
  );
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
