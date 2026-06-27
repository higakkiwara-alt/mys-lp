import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";
import type { AppConfig } from "./config.js";

export interface NoteEntry {
  path: string;
  relativePath: string;
  title: string;
  modifiedAt: Date;
  size: number;
}

export interface SearchResult {
  note: NoteEntry;
  excerpts: string[];
  tags: string[];
  frontmatter: Record<string, unknown>;
}

export function isExcluded(filePath: string, excludePaths: string[]): boolean {
  const parts = filePath.split(path.sep);
  return excludePaths.some((ex) => parts.some((part) => part === ex));
}

export function isAllowedExtension(filePath: string, extensions: string[]): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return extensions.includes(ext);
}

export function* walkDir(
  dir: string,
  config: AppConfig,
  depth = 0
): Generator<NoteEntry> {
  if (depth > config.search.maxDepth) return;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relative = path.relative(dir, fullPath);

    if (isExcluded(fullPath, config.security.excludePaths)) continue;

    if (entry.isDirectory()) {
      yield* walkDir(fullPath, config, depth + 1);
    } else if (
      entry.isFile() &&
      isAllowedExtension(entry.name, config.security.allowedExtensions)
    ) {
      const stat = fs.statSync(fullPath);
      if (stat.size > config.security.maxFileSize) continue;

      yield {
        path: fullPath,
        relativePath: relative,
        title: path.basename(entry.name, path.extname(entry.name)),
        modifiedAt: stat.mtime,
        size: stat.size,
      };
    }
  }
}

export function walkVault(vaultPath: string, config: AppConfig): NoteEntry[] {
  return Array.from(walkDir(vaultPath, config));
}

function extractExcerpts(
  content: string,
  query: string,
  contextLines: number,
  caseSensitive: boolean
): string[] {
  const lines = content.split("\n");
  const flag = caseSensitive ? "" : "i";
  let re: RegExp;
  try {
    re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flag);
  } catch {
    return [];
  }

  const excerpts: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) {
      const start = Math.max(0, i - contextLines);
      const end = Math.min(lines.length - 1, i + contextLines);
      const block = lines.slice(start, end + 1).join("\n");
      if (!excerpts.includes(block)) {
        excerpts.push(block);
      }
      if (excerpts.length >= 3) break;
    }
  }
  return excerpts;
}

export function searchNotes(
  vaultPath: string,
  query: string,
  config: AppConfig,
  limit: number = config.security.maxResults
): SearchResult[] {
  const results: SearchResult[] = [];
  const flag = config.search.caseSensitive ? "" : "i";
  let re: RegExp;
  try {
    re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flag);
  } catch {
    throw new Error(`無効な検索クエリ: ${query}`);
  }

  for (const note of walkVault(vaultPath, config)) {
    if (results.length >= limit) break;

    let raw: string;
    try {
      raw = fs.readFileSync(note.path, "utf-8");
    } catch {
      continue;
    }

    const parsed = matter(raw);
    const bodyMatches = re.test(parsed.content);
    const titleMatches = re.test(note.title);
    const fmString = JSON.stringify(parsed.data);
    const fmMatches = re.test(fmString);

    if (!bodyMatches && !titleMatches && !fmMatches) continue;

    const excerpts = extractExcerpts(
      parsed.content,
      query,
      config.search.contextLines,
      config.search.caseSensitive
    );

    const tags = extractTags(parsed.data, parsed.content);

    results.push({ note, excerpts, tags, frontmatter: parsed.data });
  }

  results.sort((a, b) => b.note.modifiedAt.getTime() - a.note.modifiedAt.getTime());
  return results;
}

function extractTags(
  frontmatter: Record<string, unknown>,
  content: string
): string[] {
  const tags = new Set<string>();

  const fmTags = frontmatter["tags"];
  if (Array.isArray(fmTags)) {
    fmTags.forEach((t) => typeof t === "string" && tags.add(t));
  } else if (typeof fmTags === "string") {
    fmTags.split(/[\s,]+/).forEach((t) => t && tags.add(t));
  }

  const inlineRe = /#([\w぀-ヿ一-鿿＀-￯_/-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = inlineRe.exec(content)) !== null) {
    tags.add(m[1]);
  }

  return Array.from(tags);
}

export function searchByTag(
  vaultPath: string,
  tag: string,
  config: AppConfig,
  limit: number = config.security.maxResults
): SearchResult[] {
  const cleanTag = tag.replace(/^#/, "");
  const results: SearchResult[] = [];

  for (const note of walkVault(vaultPath, config)) {
    if (results.length >= limit) break;

    let raw: string;
    try {
      raw = fs.readFileSync(note.path, "utf-8");
    } catch {
      continue;
    }

    const parsed = matter(raw);
    const tags = extractTags(parsed.data, parsed.content);

    if (tags.some((t) => t.toLowerCase() === cleanTag.toLowerCase())) {
      results.push({ note, excerpts: [], tags, frontmatter: parsed.data });
    }
  }

  results.sort((a, b) => b.note.modifiedAt.getTime() - a.note.modifiedAt.getTime());
  return results;
}

export function getRecentNotes(
  vaultPath: string,
  days: number,
  config: AppConfig,
  limit: number = config.security.maxResults
): NoteEntry[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  return walkVault(vaultPath, config)
    .filter((n) => n.modifiedAt.getTime() > cutoff)
    .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())
    .slice(0, limit);
}

export function listNotes(
  vaultPath: string,
  directory: string,
  recursive: boolean,
  config: AppConfig
): NoteEntry[] {
  const targetDir = directory
    ? path.join(vaultPath, directory)
    : vaultPath;

  if (!fs.existsSync(targetDir)) {
    throw new Error(`ディレクトリが存在しません: ${directory}`);
  }

  if (!targetDir.startsWith(vaultPath)) {
    throw new Error("Vaultの外部へのアクセスは禁止されています。");
  }

  if (recursive) {
    return Array.from(walkDir(targetDir, config)).map((n) => ({
      ...n,
      relativePath: path.relative(vaultPath, n.path),
    }));
  }

  const entries: NoteEntry[] = [];
  for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
    if (isExcluded(entry.name, config.security.excludePaths)) continue;

    const fullPath = path.join(targetDir, entry.name);
    if (
      entry.isFile() &&
      isAllowedExtension(entry.name, config.security.allowedExtensions)
    ) {
      const stat = fs.statSync(fullPath);
      entries.push({
        path: fullPath,
        relativePath: path.relative(vaultPath, fullPath),
        title: path.basename(entry.name, path.extname(entry.name)),
        modifiedAt: stat.mtime,
        size: stat.size,
      });
    }
  }

  return entries.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
}

export function readNote(
  vaultPath: string,
  notePath: string,
  config: AppConfig
): { content: string; frontmatter: Record<string, unknown>; tags: string[] } {
  const fullPath = path.resolve(vaultPath, notePath);

  if (!fullPath.startsWith(path.resolve(vaultPath))) {
    throw new Error("Vaultの外部へのアクセスは禁止されています。");
  }

  if (isExcluded(fullPath, config.security.excludePaths)) {
    throw new Error("このパスへのアクセスは除外されています。");
  }

  if (!fs.existsSync(fullPath)) {
    const candidates = findNoteByTitle(
      vaultPath,
      path.basename(notePath, ".md"),
      config
    );
    if (candidates.length > 0) {
      return readNote(vaultPath, candidates[0].relativePath, config);
    }
    throw new Error(`ノートが見つかりません: ${notePath}`);
  }

  const stat = fs.statSync(fullPath);
  if (stat.size > config.security.maxFileSize) {
    throw new Error("ファイルサイズが上限を超えています。");
  }

  const raw = fs.readFileSync(fullPath, "utf-8");
  const parsed = matter(raw);
  const tags = extractTags(parsed.data, parsed.content);

  return { content: parsed.content, frontmatter: parsed.data, tags };
}

export function writeNote(
  vaultPath: string,
  notePath: string,
  content: string,
  config: AppConfig
): void {
  if (config.security.readOnly) {
    throw new Error(
      "読み取り専用モードです。config.json の readOnly を false に変更してください。"
    );
  }

  const fullPath = path.resolve(vaultPath, notePath);

  if (!fullPath.startsWith(path.resolve(vaultPath))) {
    throw new Error("Vaultの外部への書き込みは禁止されています。");
  }

  if (isExcluded(fullPath, config.security.excludePaths)) {
    throw new Error("このパスへの書き込みは除外されています。");
  }

  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf-8");
}

function findNoteByTitle(
  vaultPath: string,
  title: string,
  config: AppConfig
): NoteEntry[] {
  const lower = title.toLowerCase();
  return walkVault(vaultPath, config).filter(
    (n) => n.title.toLowerCase() === lower
  );
}
