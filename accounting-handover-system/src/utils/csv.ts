/**
 * CSV ユーティリティ(純関数・テスト対象)
 * 銀行・カード明細CSVの取込と、会計ソフト取込用CSVの出力に使う。
 */

/** CSVテキストを2次元配列にパースする(ダブルクォート・改行内包に対応) */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, ''); // BOM除去
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

/** 2次元配列をCSVテキストにする(必要なフィールドのみクォート) */
export function toCsv(rows: unknown[][]): string {
  return rows
    .map((row) =>
      row
        .map((v) => {
          const s = String(v ?? '');
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\r\n');
}

export interface StatementRow {
  date: string; // yyyy-MM-dd
  description: string;
  deposit: number | '';
  withdrawal: number | '';
  balance: number | '';
}

const DATE_HEADERS = ['日付', '取引日', '利用日', 'ご利用日', 'お取引日', '年月日'];
const DESC_HEADERS = ['摘要', '内容', 'ご利用店名', '利用店名', 'お取引内容', '取引内容', '備考'];
const DEPOSIT_HEADERS = ['入金', '入金額', 'お預入額', '預入', 'お預り金額'];
const WITHDRAW_HEADERS = [
  '出金',
  '出金額',
  'お引出額',
  '引出',
  'お支払額',
  '利用金額',
  'ご利用金額',
  '支払金額',
];
const BALANCE_HEADERS = ['残高', '差引残高', 'お取引後残高'];

function findCol(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const i = headers.findIndex((h) => h.replace(/\s/g, '').includes(c));
    if (i >= 0) return i;
  }
  return -1;
}

function toAmount(s: string): number | '' {
  const v = String(s ?? '')
    .replace(/[,¥\\\s円"]/g, '')
    .trim();
  if (v === '' || v === '-') return '';
  const n = Number(v);
  return isFinite(n) ? n : '';
}

function normalizeDate(s: string): string {
  const m = String(s ?? '')
    .trim()
    .match(/^(\d{4})[年/.\-](\d{1,2})[月/.\-](\d{1,2})/);
  if (!m) return String(s ?? '').trim();
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

/**
 * 銀行・カード明細CSVを解析する(純関数)。
 * ヘッダー行(日付列+金額列を含む行)を自動検出し、代表的な列名の揺れに対応する。
 * 解析できない場合は空配列を返す(エラーにしない)。
 */
export function parseStatementCsv(text: string): StatementRow[] {
  const rows = parseCsv(text);
  // ヘッダー行を探す(先頭10行以内)
  let headerIdx = -1;
  let cols = { date: -1, desc: -1, dep: -1, wd: -1, bal: -1 };
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const headers = rows[i].map((h) => String(h ?? '').trim());
    const date = findCol(headers, DATE_HEADERS);
    const dep = findCol(headers, DEPOSIT_HEADERS);
    const wd = findCol(headers, WITHDRAW_HEADERS);
    if (date >= 0 && (dep >= 0 || wd >= 0)) {
      headerIdx = i;
      cols = {
        date,
        desc: findCol(headers, DESC_HEADERS),
        dep,
        wd,
        bal: findCol(headers, BALANCE_HEADERS),
      };
      break;
    }
  }
  if (headerIdx < 0) return [];

  const result: StatementRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const date = normalizeDate(String(r[cols.date] ?? ''));
    if (!/^\d{4}-\d{2}-\d{2}/.test(date)) continue; // 日付でない行(小計等)は無視
    result.push({
      date,
      description: cols.desc >= 0 ? String(r[cols.desc] ?? '').trim() : '',
      deposit: cols.dep >= 0 ? toAmount(String(r[cols.dep] ?? '')) : '',
      withdrawal: cols.wd >= 0 ? toAmount(String(r[cols.wd] ?? '')) : '',
      balance: cols.bal >= 0 ? toAmount(String(r[cols.bal] ?? '')) : '',
    });
  }
  return result;
}

/** 明細行の重複防止キー(内容ベースの簡易ハッシュ) */
export function statementKey(accountName: string, row: StatementRow): string {
  const src = [
    accountName,
    row.date,
    row.description,
    row.deposit,
    row.withdrawal,
    row.balance,
  ].join('|');
  let hash = 0;
  for (let i = 0; i < src.length; i++) {
    hash = (hash * 31 + src.charCodeAt(i)) | 0;
  }
  return `STM-${Math.abs(hash)}`;
}
