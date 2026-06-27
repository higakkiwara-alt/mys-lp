import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface VaultConfig {
  name: string;
  path: string;
  description?: string;
}

export interface SecurityConfig {
  readOnly: boolean;
  excludePaths: string[];
  maxResults: number;
  maxFileSize: number;
  allowedExtensions: string[];
}

export interface SearchConfig {
  caseSensitive: boolean;
  maxDepth: number;
  contextLines: number;
}

export interface AppConfig {
  vaults: VaultConfig[];
  security: SecurityConfig;
  search: SearchConfig;
}

const DEFAULTS: AppConfig = {
  vaults: [],
  security: {
    readOnly: true,
    excludePaths: [".obsidian", ".git", ".trash"],
    maxResults: 50,
    maxFileSize: 1048576,
    allowedExtensions: [".md", ".txt", ".canvas"],
  },
  search: {
    caseSensitive: false,
    maxDepth: 10,
    contextLines: 3,
  },
};

export function loadConfig(): AppConfig {
  const configPath =
    process.env.OBSIDIAN_MCP_CONFIG ||
    path.join(path.dirname(__dirname), "config.json");

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `設定ファイルが見つかりません: ${configPath}\n` +
        `config.example.json を config.json にコピーし、Vaultパスを設定してください。\n` +
        `例: cp config.example.json config.json && nano config.json`
    );
  }

  let userConfig: Partial<AppConfig>;
  try {
    userConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (e) {
    throw new Error(`config.json の解析に失敗しました: ${e}`);
  }

  const config: AppConfig = {
    vaults: userConfig.vaults ?? DEFAULTS.vaults,
    security: { ...DEFAULTS.security, ...userConfig.security },
    search: { ...DEFAULTS.search, ...userConfig.search },
  };

  if (config.vaults.length === 0) {
    throw new Error("config.json に少なくとも1つのVaultを設定してください。");
  }

  for (const vault of config.vaults) {
    const expanded = expandHome(vault.path);
    vault.path = expanded;
    if (!fs.existsSync(expanded)) {
      throw new Error(
        `Vaultパスが存在しません: ${expanded}\n` +
          `config.json の "path" を正しいObsidian Vaultのパスに変更してください。`
      );
    }
  }

  return config;
}

export function expandHome(p: string): string {
  if (p.startsWith("~/")) {
    return path.join(process.env.HOME || "~", p.slice(2));
  }
  return p;
}

export function getVault(config: AppConfig, name?: string): VaultConfig {
  if (!name) return config.vaults[0];
  const vault = config.vaults.find((v) => v.name === name);
  if (!vault) {
    const names = config.vaults.map((v) => v.name).join(", ");
    throw new Error(`Vault "${name}" が見つかりません。利用可能: ${names}`);
  }
  return vault;
}
