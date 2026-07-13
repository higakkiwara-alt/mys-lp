/**
 * 汎用ヘルパー(純関数のみ)
 * GAS のグローバル API に依存しないため、Vitest で単体テストできる。
 */

/** 数値をゼロ埋め */
export function pad(n: number, len: number): string {
  return String(Math.trunc(Math.abs(n))).padStart(len, '0');
}

/** 空欄判定 */
export function isBlank(v: unknown): boolean {
  return v === null || v === undefined || String(v).trim() === '';
}

/** Date → 'yyyy-MM-dd' (ローカルタイム) */
export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`;
}

/** Date → 'yyyy-MM-dd HH:mm:ss' */
export function formatDateTime(d: Date): string {
  return `${formatDate(d)} ${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}`;
}

/** Date → 'YYYYMM' */
export function toYearMonth(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1, 2)}`;
}

/** Date → 'YYYY-MM' */
export function toYearMonthHyphen(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}`;
}

/** 'YYYY-MM' または 'YYYYMM' → {year, month}。不正なら null */
export function parseYearMonth(s: string): { year: number; month: number } | null {
  const m = String(s)
    .trim()
    .match(/^(\d{4})-?(\d{1,2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/** 翌月の {year, month} */
export function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/** 列番号(1始まり) → A1形式の列文字 */
export function colToLetter(col: number): string {
  let s = '';
  let n = col;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** 値を Date に変換(Date / 'yyyy-MM-dd' / 'yyyy/MM/dd')。変換不能なら null */
export function toDate(v: unknown): Date | null {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number' && isFinite(v)) return null; // シリアル値は扱わない(表示形式で日付になるため)
  if (typeof v !== 'string') return null;
  const m = v.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

/** 日数差(b - a)。時刻は無視して日単位で比較 */
export function daysBetween(a: Date, b: Date): number {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((db - da) / (24 * 60 * 60 * 1000));
}

/** レシートの重複判定キー: 利用日+購入先+金額+利用者 */
export function buildDedupKey(
  useDate: unknown,
  vendor: unknown,
  amount: unknown,
  user: unknown,
): string {
  const d = toDate(useDate);
  const dateStr = d ? formatDate(d) : String(useDate ?? '').trim();
  const amt = String(amount ?? '').replace(/[,¥\s]/g, '');
  return [dateStr, String(vendor ?? '').trim(), amt, String(user ?? '').trim()].join('|');
}

/** ファイル名に使えない文字を除去し、空白をアンダースコアへ */
export function sanitizeFileNamePart(s: string): string {
  return String(s ?? '')
    .replace(/[\\/:*?"<>|#{}%~&]/g, '') // 使用禁止・トラブルになりやすい文字を除去
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** 提案ファイル名の生成: YYYYMMDD_法人または店舗名_取引先_書類種別_金額_管理ID */
export function buildFileName(parts: {
  date: Date | string;
  entity: string;
  vendor: string;
  docType: string;
  amount: number | string;
  manageId: string;
  extension?: string;
}): string {
  const d = toDate(parts.date) ?? new Date(1970, 0, 1);
  const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}`;
  const amount = String(parts.amount ?? '').replace(/[,¥\s円]/g, '');
  const base = [
    dateStr,
    sanitizeFileNamePart(parts.entity),
    sanitizeFileNamePart(parts.vendor),
    sanitizeFileNamePart(parts.docType),
    sanitizeFileNamePart(amount),
    sanitizeFileNamePart(parts.manageId),
  ]
    .filter((p) => p !== '')
    .join('_');
  // 長すぎるファイル名を制限(拡張子を除き最大120文字)
  const trimmed = base.length > 120 ? base.slice(0, 120) : base;
  const ext = (parts.extension ?? '').replace(/^\./, '');
  return ext ? `${trimmed}.${ext}` : trimmed;
}

/** 2次元配列とヘッダー行から、ヘッダー名→値 のレコード配列を作る */
export function rowsToRecords(
  headers: string[],
  rows: unknown[][],
): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const rec: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      rec[h] = row[i];
    });
    return rec;
  });
}

/** 配列から重複を除去 */
export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
