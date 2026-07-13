/**
 * エラー定義
 */

/** 設定不足など、利用者が対処できるエラー */
export class ConfigError extends Error {
  constructor(message: string) {
    super(`[設定エラー] ${message}`);
    this.name = 'ConfigError';
  }
}

/** シート構成の問題 */
export class SheetStructureError extends Error {
  constructor(message: string) {
    super(`[シート構成エラー] ${message}`);
    this.name = 'SheetStructureError';
  }
}

/** unknown を安全にメッセージ化 */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}

/** unknown からスタックを取り出す(無ければ空) */
export function errorStack(e: unknown): string {
  if (e instanceof Error && e.stack) return e.stack;
  return '';
}
