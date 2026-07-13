/**
 * 管理ID自動採番サービス
 * 形式: ACC-YYYYMM-0001(月内連番) / FIX-0001(通し番号) / LOG-YYYYMMDD-0001
 * 既存IDを読み取り最大値+1を採番する。書き込みを伴う採番は LockService で排他する。
 */
import { SHEETS } from '../constants';
import type { SheetKey } from '../types';
import { pad, toYearMonth } from '../utils/helpers';
import { withScriptLock } from '../utils/lock';
import { colOf, ensureSheet } from './sheetService';

/**
 * 既存ID一覧から次の連番を求める(純関数・テスト対象)
 * @param existingIds 既存のID文字列一覧
 * @param prefix 例 'ACC'
 * @param ymPart 'YYYYMM'。空文字なら通し番号形式(FIX-0001 等)
 */
export function nextSequence(existingIds: string[], prefix: string, ymPart: string): number {
  const pattern = ymPart
    ? new RegExp(`^${prefix}-${ymPart}-(\\d{4,})$`)
    : new RegExp(`^${prefix}-(\\d{4,})$`);
  let max = 0;
  for (const id of existingIds) {
    const m = String(id ?? '')
      .trim()
      .match(pattern);
    if (m) {
      const n = Number(m[1]);
      if (n > max) max = n;
    }
  }
  return max + 1;
}

/** ID文字列を組み立てる(純関数) */
export function formatId(prefix: string, ymPart: string, seq: number): string {
  return ymPart ? `${prefix}-${ymPart}-${pad(seq, 4)}` : `${prefix}-${pad(seq, 4)}`;
}

/** シートのID列(1列目)の既存値を読む */
function readExistingIds(key: SheetKey): string[] {
  const sheet = ensureSheet(key);
  const idHeader = SHEETS[key].headers[0];
  const col = colOf(sheet, idHeader);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet
    .getRange(2, col, lastRow - 1, 1)
    .getValues()
    .map((r) => String(r[0] ?? ''));
}

/**
 * 次の管理IDを採番する(読み取りのみ。行への書き込みは呼び出し側)。
 * 同時編集での重複を防ぐため、呼び出し側が採番+書き込みを assignIdsToRows などの
 * ロック内処理で行うこと。
 */
export function generateNextId(key: SheetKey, baseDate?: Date): string {
  const def = SHEETS[key];
  if (!def.idPrefix) {
    throw new Error(`シート ${def.name} は自動採番の対象ではありません`);
  }
  const ymPart = def.idWithMonth ? toYearMonth(baseDate ?? new Date()) : '';
  const seq = nextSequence(readExistingIds(key), def.idPrefix, ymPart);
  return formatId(def.idPrefix, ymPart, seq);
}

/**
 * 指定行のID列が空なら採番して書き込む(LockServiceで排他)。
 * 戻り値: 書き込んだID(既にIDがある場合はその値)
 */
export function assignIdToRow(key: SheetKey, rowNumber: number, baseDate?: Date): string {
  return withScriptLock(() => {
    const sheet = ensureSheet(key);
    const idHeader = SHEETS[key].headers[0];
    const col = colOf(sheet, idHeader);
    const cell = sheet.getRange(rowNumber, col);
    const current = String(cell.getValue() ?? '').trim();
    if (current !== '') return current; // 冪等: 既にIDがあれば触らない
    const id = generateNextId(key, baseDate);
    cell.setValue(id);
    return id;
  });
}
