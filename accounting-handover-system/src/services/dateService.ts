/**
 * 日時関連サービス
 * 現在時刻の取得と、シートへの日時自動入力(既存値は上書きしない)。
 */
import type { SheetKey } from '../types';
import { formatDate, formatDateTime, isBlank } from '../utils/helpers';
import { ensureSheet, headerMap } from './sheetService';

export function now(): Date {
  return new Date();
}

export function todayStr(): string {
  return formatDate(new Date());
}

export function nowStr(): string {
  return formatDateTime(new Date());
}

/**
 * 指定行の日時列を自動入力する。
 * - fillIfEmpty: 空欄の場合のみ書く(登録日時・受付日など)
 * - overwrite: 常に上書きする(最終更新日時など)
 */
export function stampRow(
  key: SheetKey,
  rowNumber: number,
  opts: { fillIfEmpty?: Record<string, string>; overwrite?: Record<string, string> },
): void {
  const sheet = ensureSheet(key);
  const map = headerMap(sheet);
  if (opts.fillIfEmpty) {
    for (const [header, value] of Object.entries(opts.fillIfEmpty)) {
      const col = map[header];
      if (!col) continue;
      const cell = sheet.getRange(rowNumber, col);
      if (isBlank(cell.getValue())) cell.setValue(value);
    }
  }
  if (opts.overwrite) {
    for (const [header, value] of Object.entries(opts.overwrite)) {
      const col = map[header];
      if (!col) continue;
      sheet.getRange(rowNumber, col).setValue(value);
    }
  }
}
