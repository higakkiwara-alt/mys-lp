/**
 * シート操作の基盤サービス
 * - シートの取得・自動作成(冪等)
 * - 不足列の追加(既存データ・既存列は消さない)
 * - ヘッダー名 → 列番号 の解決
 */
import { SHEETS, SHEET_ORDER } from '../constants';
import type { SheetDef, SheetKey } from '../types';
import { getConfig } from '../config';
import { SheetStructureError } from '../utils/errors';
import { colToLetter, rowsToRecords } from '../utils/helpers';

type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;

/** 対象スプレッドシートを取得(コンテナバインド優先、無ければ設定のID) */
export function getSs(): Spreadsheet {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const cfg = getConfig();
  if (cfg.spreadsheetId) return SpreadsheetApp.openById(cfg.spreadsheetId);
  throw new SheetStructureError(
    'スプレッドシートが見つかりません。コンテナバインドで実行するか、Script Properties の SPREADSHEET_ID を設定してください。',
  );
}

/** シートを取得(無ければ null) */
export function findSheet(key: SheetKey): Sheet | null {
  return getSs().getSheetByName(SHEETS[key].name);
}

/** シートを取得。無ければ作成し、ヘッダー行を整える(冪等) */
export function ensureSheet(key: SheetKey): Sheet {
  const ss = getSs();
  const def = SHEETS[key];
  let sheet = ss.getSheetByName(def.name);
  if (!sheet) {
    sheet = ss.insertSheet(def.name);
  }
  if (def.headers.length > 0) {
    ensureHeaders(sheet, def);
  }
  return sheet;
}

/**
 * ヘッダー行を保証する。
 * - 1行目が空なら定義どおりに書く
 * - 既存ヘッダーがあれば残し、定義にあって存在しない列だけ右端へ追加する
 * - 既存列の削除・並べ替えはしない(データ保護)
 */
export function ensureHeaders(sheet: Sheet, def: SheetDef): void {
  const lastCol = sheet.getLastColumn();
  const existing: string[] =
    lastCol > 0
      ? (sheet.getRange(1, 1, 1, lastCol).getValues()[0] as unknown[]).map((v) =>
          String(v ?? '').trim(),
        )
      : [];
  const hasAny = existing.some((h) => h !== '');
  if (!hasAny) {
    sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
    return;
  }
  const missing = def.headers.filter((h) => !existing.includes(h));
  if (missing.length > 0) {
    const start = existing.length + 1;
    sheet.getRange(1, start, 1, missing.length).setValues([missing]);
  }
}

/** ヘッダー名 → 列番号(1始まり) のマップ */
export function headerMap(sheet: Sheet): Record<string, number> {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return {};
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0] as unknown[];
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    const name = String(h ?? '').trim();
    if (name && !(name in map)) map[name] = i + 1;
  });
  return map;
}

/** ヘッダー名から列番号を取得(無ければエラー) */
export function colOf(sheet: Sheet, header: string): number {
  const map = headerMap(sheet);
  const col = map[header];
  if (!col) {
    throw new SheetStructureError(
      `シート「${sheet.getName()}」に列「${header}」がありません。メニュー「シート構成を修復」を実行してください。`,
    );
  }
  return col;
}

/** ヘッダー名から A1 形式の列文字を取得 */
export function colLetterOf(sheet: Sheet, header: string): string {
  return colToLetter(colOf(sheet, header));
}

/** データ行をレコード配列で取得。rowNumber は実際の行番号(2始まり) */
export function readRecords(
  key: SheetKey,
): Array<{ rowNumber: number; record: Record<string, unknown> }> {
  const sheet = findSheet(key);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol === 0) return [];
  const headers = (sheet.getRange(1, 1, 1, lastCol).getValues()[0] as unknown[]).map((v) =>
    String(v ?? '').trim(),
  );
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return rowsToRecords(headers, values).map((record, i) => ({ rowNumber: i + 2, record }));
}

/** レコード(ヘッダー名→値)を1行追加する。戻り値は追加した行番号 */
export function appendRecord(key: SheetKey, record: Record<string, unknown>): number {
  const sheet = ensureSheet(key);
  const map = headerMap(sheet);
  const lastCol = sheet.getLastColumn();
  const row: unknown[] = new Array(lastCol).fill('');
  for (const [header, value] of Object.entries(record)) {
    const col = map[header];
    if (col) row[col - 1] = value;
  }
  const rowNumber = sheet.getLastRow() + 1;
  sheet.getRange(rowNumber, 1, 1, lastCol).setValues([row]);
  return rowNumber;
}

/** シートを定義順に並べ替える(存在するものだけ) */
export function reorderSheets(): void {
  const ss = getSs();
  let pos = 1;
  for (const key of SHEET_ORDER) {
    const sheet = ss.getSheetByName(SHEETS[key].name);
    if (sheet) {
      ss.setActiveSheet(sheet);
      ss.moveActiveSheet(pos);
      pos++;
    }
  }
}

/** シート名から SheetKey を逆引き(該当なしは null) */
export function keyOfSheetName(name: string): SheetKey | null {
  for (const key of SHEET_ORDER) {
    if (SHEETS[key].name === name) return key;
  }
  return null;
}
