/**
 * onEdit ハンドラー(インストーラブルトリガー)
 * - 管理IDの自動採番(ID列が空で内容がある行)
 * - 登録日時・更新日時の自動記録
 * - ステータス連動の日付入力(完了日・支払完了日・入力日・回答日)
 * - 重要列の変更履歴記録
 * - レシートの重複判定キー更新
 *
 * 無限ループ防止:
 * - スクリプトによる setValue は onEdit を発火させない(GASの仕様)
 * - さらにログ系シート(14/15/16)と行1(ヘッダー)は処理対象外にする
 */
import { SHEETS, STATUS, PAY_STATUS, ENTRY_STATUS } from '../constants';
import type { SheetKey } from '../types';
import { buildDedupKey, formatDate, formatDateTime, isBlank } from '../utils/helpers';
import { logger } from '../utils/logger';
import { errorMessage } from '../utils/errors';
import { appendChangeLogs, type ChangeEntry } from '../services/changeLogService';
import { assignIdToRow } from '../services/idService';
import { headerMap, keyOfSheetName } from '../services/sheetService';
import { findDuplicateReceipts } from '../services/validationService';

const MAX_ROWS_PER_EDIT = 200;
const IGNORED_KEYS: SheetKey[] = [
  'CHANGE_LOG',
  'SYSTEM_LOG',
  'ERROR_LIST',
  'DASHBOARD',
  'FORM_INBOX',
  // Phase 2 のシステム管理シート(スクリプトが書き込む。ユーザー編集への自動処理は不要)
  'SQUARE_SALES',
  'STATEMENT',
  'STORE_PL',
  'FILE_CLASSIFY',
  'GMAIL_LOG',
];

export function handleEdit(e: GoogleAppsScript.Events.SheetsOnEdit): void {
  try {
    const range = e.range;
    const sheet = range.getSheet();
    const key = keyOfSheetName(sheet.getName());
    if (!key || IGNORED_KEYS.includes(key)) return;
    const def = SHEETS[key];
    if (def.headers.length === 0) return;

    const startRow = Math.max(range.getRow(), 2);
    const endRow = Math.min(range.getLastRow(), startRow + MAX_ROWS_PER_EDIT - 1);
    if (endRow < 2 || range.getLastRow() < 2) return; // ヘッダーのみの編集

    const map = headerMap(sheet);
    const editedCols: string[] = [];
    for (const [header, col] of Object.entries(map)) {
      if (col >= range.getColumn() && col <= range.getLastColumn()) editedCols.push(header);
    }

    const nowStr = formatDateTime(new Date());
    const today = formatDate(new Date());
    let user = '';
    try {
      user = Session.getActiveUser().getEmail() || '(不明)';
    } catch {
      user = '(不明)';
    }

    // --- 変更履歴(単一セル編集のときのみ変更前が取得できる) ---
    const logCols = def.logCols ?? [];
    const entries: ChangeEntry[] = [];
    const idHeader = def.headers[0];
    const isSingleCell = range.getNumRows() === 1 && range.getNumColumns() === 1;
    if (logCols.length > 0) {
      for (const header of editedCols) {
        if (!logCols.includes(header)) continue;
        for (let row = startRow; row <= endRow; row++) {
          const manageId = map[idHeader]
            ? String(sheet.getRange(row, map[idHeader]).getValue() ?? '')
            : '';
          entries.push({
            sheetName: sheet.getName(),
            manageId,
            rowNumber: row,
            user,
            column: header,
            before: isSingleCell ? String(e.oldValue ?? '') : '(一括編集のため不明)',
            after: String(sheet.getRange(row, map[header]).getValue() ?? ''),
            operation: isSingleCell ? '編集' : '一括編集',
          });
        }
      }
    }
    if (entries.length > 0) appendChangeLogs(entries);

    // --- 行ごとの自動処理 ---
    for (let row = startRow; row <= endRow; row++) {
      processRow(key, sheet, map, row, editedCols, nowStr, today);
    }

    // --- レシート重複判定(該当列が編集された場合のみ) ---
    if (
      key === 'RECEIPT' &&
      editedCols.some((h) => ['利用日', '購入先', '金額', '利用者'].includes(h))
    ) {
      updateReceiptDedup(sheet, map, startRow, endRow);
    }
  } catch (err) {
    // onEdit の失敗はユーザー操作を妨げないよう、ログのみ残す
    logger.error('handleEdit', `onEdit処理でエラー: ${errorMessage(err)}`, err);
  }
}

function processRow(
  key: SheetKey,
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  map: Record<string, number>,
  row: number,
  editedCols: string[],
  nowStr: string,
  today: string,
): void {
  const def = SHEETS[key];
  const idHeader = def.headers[0];
  const idCol = map[idHeader];

  // 行が空なら何もしない
  const lastCol = sheet.getLastColumn();
  const rowValues = sheet.getRange(row, 1, 1, lastCol).getValues()[0];
  const hasContent = rowValues.some((v, i) => i + 1 !== idCol && !isBlank(v));
  if (!hasContent) return;

  // 管理IDの自動採番
  if (def.idPrefix && idCol && isBlank(rowValues[idCol - 1])) {
    assignIdToRow(key, row);
  }

  const setIfEmpty = (header: string, value: unknown): void => {
    const col = map[header];
    if (!col) return;
    if (isBlank(sheet.getRange(row, col).getValue())) sheet.getRange(row, col).setValue(value);
  };
  const setAlways = (header: string, value: unknown): void => {
    const col = map[header];
    if (col) sheet.getRange(row, col).setValue(value);
  };
  const valueOf = (header: string): string => {
    const col = map[header];
    return col ? String(sheet.getRange(row, col).getValue() ?? '').trim() : '';
  };

  // 登録・更新日時
  setIfEmpty('登録日時', nowStr);
  if (map['受付日']) setIfEmpty('受付日', today);
  if (map['登録日']) setIfEmpty('登録日', today);
  if (map['最終更新日時']) setAlways('最終更新日時', nowStr);
  else if (map['更新日時']) setAlways('更新日時', nowStr);

  // ステータス連動(既存値は上書きしない。処理済み以外へ戻しても完了日は消さない)
  switch (key) {
    case 'INTAKE':
      if (valueOf('現在のステータス') === STATUS.DONE) setIfEmpty('完了日', today);
      break;
    case 'RECEIPT':
      if (valueOf('会計ソフト入力状況') === ENTRY_STATUS.DONE) setIfEmpty('入力日', today);
      break;
    case 'INVOICE':
      if (valueOf('支払状況') === PAY_STATUS.PAID) setIfEmpty('支払完了日', today);
      break;
    case 'QUESTION':
      if (!isBlank(valueOf('回答内容')) || valueOf('ステータス') === STATUS.DONE) {
        if (!isBlank(valueOf('回答内容'))) setIfEmpty('回答日', today);
      }
      break;
    case 'MONTHLY_CLOSE':
      if (valueOf('実施状況') === '完了') setIfEmpty('完了日', today);
      break;
    default:
      break;
  }

  void editedCols;
}

/** 編集された行の重複判定キーを更新し、全体の重複候補フラグを再計算する */
function updateReceiptDedup(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  map: Record<string, number>,
  startRow: number,
  endRow: number,
): void {
  const keyCol = map['重複判定キー'];
  const dupCol = map['重複候補'];
  if (!keyCol || !dupCol) return;
  for (let row = startRow; row <= endRow; row++) {
    const get = (header: string): unknown =>
      map[header] ? sheet.getRange(row, map[header]).getValue() : '';
    const key = buildDedupKey(get('利用日'), get('購入先'), get('金額'), get('利用者'));
    sheet.getRange(row, keyCol).setValue(key);
  }
  // 重複候補フラグを全行再計算(行数は限定的なので許容)
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const keys = sheet.getRange(2, keyCol, lastRow - 1, 1).getValues();
  const keyed = keys.map((k, i) => ({ rowNumber: i + 2, key: String(k[0] ?? '') }));
  const dupMap = findDuplicateReceipts(keyed);
  const dupRows = new Set<number>();
  for (const rows of dupMap.values()) rows.forEach((r) => dupRows.add(r));
  sheet.getRange(2, dupCol, lastRow - 1, 1).setValues(keyed.map((k) => [dupRows.has(k.rowNumber)]));
}
