/**
 * 変更履歴サービス(14_変更履歴)
 * onEdit から呼ばれ、重要列の変更を記録する。
 * - 14/15/16 などのログ系シートへの編集は記録しない(無限ループ防止)
 * - 大量貼り付けは上限件数まで記録し、超過分は件数のみ記録する
 */
import { SHEETS } from '../constants';
import type { SheetKey } from '../types';
import { formatDateTime } from '../utils/helpers';
import { formatId, nextSequence } from './idService';
import { findSheet } from './sheetService';

const MAX_BATCH_LOG = 200;

export interface ChangeEntry {
  sheetName: string;
  manageId: string;
  rowNumber: number;
  user: string;
  column: string;
  before: string;
  after: string;
  operation: string;
  note?: string;
}

/** このシートの変更を履歴対象にするか */
export function isLoggableSheet(key: SheetKey | null): boolean {
  if (!key) return false;
  return !!SHEETS[key].logCols && SHEETS[key].logCols!.length > 0;
}

/** 変更履歴をまとめて書き込む */
export function appendChangeLogs(entries: ChangeEntry[]): void {
  if (entries.length === 0) return;
  const sheet = findSheet('CHANGE_LOG');
  if (!sheet) return;

  let toWrite = entries;
  let overflowNote: ChangeEntry | null = null;
  if (entries.length > MAX_BATCH_LOG) {
    toWrite = entries.slice(0, MAX_BATCH_LOG);
    overflowNote = {
      sheetName: entries[0].sheetName,
      manageId: '',
      rowNumber: 0,
      user: entries[0].user,
      column: '(一括変更)',
      before: '',
      after: '',
      operation: '一括編集',
      note: `変更が ${entries.length} 件あったため先頭 ${MAX_BATCH_LOG} 件のみ記録しました`,
    };
  }

  // 変更IDは書き込み済み行数から連番を振る(履歴は追記専用なので単純でよい)
  const lastRow = sheet.getLastRow();
  const existingIds =
    lastRow >= 2
      ? sheet
          .getRange(2, 1, lastRow - 1, 1)
          .getValues()
          .map((r) => String(r[0]))
      : [];
  let seq = nextSequence(existingIds, 'CHG', '');

  const ts = formatDateTime(new Date());
  const rows = [...toWrite, ...(overflowNote ? [overflowNote] : [])].map((e) => [
    formatId('CHG', '', seq++),
    ts,
    e.sheetName,
    e.manageId,
    e.rowNumber || '',
    e.user,
    e.column,
    e.before,
    e.after,
    e.operation,
    e.note ?? '',
  ]);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}
