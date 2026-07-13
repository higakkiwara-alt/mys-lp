/**
 * システムログ(15_システムログ)への記録
 * ログ記録自体の失敗でメイン処理を止めない。
 * 書類内容の全文などはログに残さない(メッセージは要約のみ)。
 */
import { SHEETS } from '../constants';
import { formatDateTime } from './helpers';
import { errorMessage, errorStack } from './errors';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

const MAX_LOG_ROWS = 5000;

function writeLog(
  level: LogLevel,
  processName: string,
  message: string,
  opts?: { sheetName?: string; manageId?: string; errorDetail?: string; note?: string },
): void {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    const sheet = ss.getSheetByName(SHEETS.SYSTEM_LOG.name);
    if (!sheet) return;
    let user = '';
    try {
      user = Session.getActiveUser().getEmail();
    } catch {
      user = '(不明)';
    }
    sheet.appendRow([
      formatDateTime(new Date()),
      level,
      processName,
      String(message).slice(0, 500),
      opts?.sheetName ?? '',
      opts?.manageId ?? '',
      user,
      (opts?.errorDetail ?? '').slice(0, 1000),
      opts?.note ?? '',
    ]);
    // ログが肥大化したら古い行を削除(ヘッダーは残す)
    const rows = sheet.getLastRow();
    if (rows > MAX_LOG_ROWS + 1) {
      sheet.deleteRows(2, rows - MAX_LOG_ROWS - 1);
    }
  } catch (e) {
    // ログ失敗は握りつぶす(コンソールにのみ出す)
    console.error('ログ記録に失敗: ' + errorMessage(e));
  }
}

export const logger = {
  info(processName: string, message: string, opts?: Parameters<typeof writeLog>[3]): void {
    console.log(`[INFO] ${processName}: ${message}`);
    writeLog('INFO', processName, message, opts);
  },
  warn(processName: string, message: string, opts?: Parameters<typeof writeLog>[3]): void {
    console.warn(`[WARN] ${processName}: ${message}`);
    writeLog('WARN', processName, message, opts);
  },
  error(processName: string, message: string, e?: unknown): void {
    console.error(`[ERROR] ${processName}: ${message}`, e);
    writeLog('ERROR', processName, message, {
      errorDetail: e !== undefined ? `${errorMessage(e)}\n${errorStack(e)}` : '',
    });
  },
};
