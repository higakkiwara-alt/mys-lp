/**
 * onChange ハンドラー
 * 行・列の挿入/削除やシート構造の変更を検知してログに残す。
 * (誰かが誤ってシートを削除した場合の調査手掛かりになる)
 */
import { logger } from '../utils/logger';

const STRUCTURAL = [
  'INSERT_ROW',
  'REMOVE_ROW',
  'INSERT_COLUMN',
  'REMOVE_COLUMN',
  'INSERT_GRID',
  'REMOVE_GRID',
];

export function handleChangeEvent(e: GoogleAppsScript.Events.SheetsOnChange): void {
  try {
    const type = String(e.changeType ?? '');
    if (!STRUCTURAL.includes(type)) return;
    logger.info('handleChange', `シート構造の変更を検知: ${type}`);
  } catch {
    // ログのみの処理なので握りつぶす
  }
}
