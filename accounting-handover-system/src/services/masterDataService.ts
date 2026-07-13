/**
 * マスターデータサービス
 * 13_設定・選択肢マスターの読み書きと、店舗・担当者マスターの参照。
 */
import { COMPANY_WIDE, SETTINGS_SEED, SHEETS } from '../constants';
import { logger } from '../utils/logger';
import { colOf, ensureSheet, readRecords } from './sheetService';

/** 設定マスターからカテゴリの有効な選択肢を表示順で取得 */
export function getOptions(category: string): string[] {
  const rows = readRecords('SETTINGS');
  return rows
    .map((r) => r.record)
    .filter(
      (rec) =>
        String(rec['カテゴリ'] ?? '').trim() === category &&
        String(rec['有効'] ?? '').toUpperCase() !== 'FALSE' &&
        String(rec['設定値'] ?? '').trim() !== '',
    )
    .sort((a, b) => Number(a['表示順'] ?? 0) - Number(b['表示順'] ?? 0))
    .map((rec) => String(rec['設定値']).trim());
}

/** 設定マスターへ初期データを投入(既存の カテゴリ+設定値 は重複登録しない) */
export function seedSettings(): number {
  const sheet = ensureSheet('SETTINGS');
  const existing = new Set(
    readRecords('SETTINGS').map(
      (r) =>
        `${String(r.record['カテゴリ'] ?? '').trim()}|${String(r.record['設定値'] ?? '').trim()}`,
    ),
  );
  const rows: unknown[][] = [];
  for (const [category, values] of SETTINGS_SEED) {
    values.forEach((value, i) => {
      if (!existing.has(`${category}|${value}`)) {
        rows.push([category, value, i + 1, true]);
      }
    });
  }
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 4).setValues(rows);
    logger.info('seedSettings', `設定マスターへ ${rows.length} 件追加しました`);
  }
  return rows.length;
}

/** 稼働中の店舗名一覧 */
export function getActiveStoreNames(): string[] {
  return readRecords('BUSINESS')
    .map((r) => r.record)
    .filter(
      (rec) =>
        String(rec['稼働状況'] ?? '').trim() === '稼働中' &&
        String(rec['店舗名'] ?? '').trim() !== '',
    )
    .map((rec) => String(rec['店舗名']).trim());
}

/** 店舗名一覧(全社を含む。プルダウン・整合性チェック用) */
export function getAllStoreNames(): string[] {
  const names = readRecords('BUSINESS')
    .map((r) => String(r.record['店舗名'] ?? '').trim())
    .filter((n) => n !== '');
  return [COMPANY_WIDE, ...names];
}

/** 稼働中の担当者氏名一覧 */
export function getActiveStaffNames(): string[] {
  return readRecords('STAFF')
    .map((r) => r.record)
    .filter(
      (rec) =>
        String(rec['稼働状況'] ?? '').trim() !== '退職' && String(rec['氏名'] ?? '').trim() !== '',
    )
    .map((rec) => String(rec['氏名']).trim());
}

/** 通知対象の担当者メールアドレス一覧 */
export function getNotificationTargetEmails(): string[] {
  return readRecords('STAFF')
    .map((r) => r.record)
    .filter(
      (rec) =>
        String(rec['通知対象'] ?? '').toUpperCase() === 'TRUE' &&
        String(rec['メールアドレス'] ?? '').includes('@'),
    )
    .map((rec) => String(rec['メールアドレス']).trim());
}

/** 店舗マスター参照範囲(店舗名列)の A1 表記を返す(入力規則の動的参照用) */
export function storeNameRangeA1(): string {
  const sheet = ensureSheet('BUSINESS');
  const col = colOf(sheet, '店舗名');
  return `'${SHEETS.BUSINESS.name}'!${a1Col(col)}2:${a1Col(col)}`;
}

/** 担当者マスター参照範囲(氏名列) */
export function staffNameRangeA1(): string {
  const sheet = ensureSheet('STAFF');
  const col = colOf(sheet, '氏名');
  return `'${SHEETS.STAFF.name}'!${a1Col(col)}2:${a1Col(col)}`;
}

/** 取引先マスター参照範囲(取引先名列) */
export function vendorNameRangeA1(): string {
  const sheet = ensureSheet('VENDOR');
  const col = colOf(sheet, '取引先名');
  return `'${SHEETS.VENDOR.name}'!${a1Col(col)}2:${a1Col(col)}`;
}

function a1Col(col: number): string {
  let s = '';
  let n = col;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
