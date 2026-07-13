/**
 * 全シートの作成(冪等)
 * 既存シートは再利用し、不足シート・不足列だけを追加する。
 */
import { SHEET_ORDER } from '../constants';
import { logger } from '../utils/logger';
import { ensureSheet, reorderSheets } from '../services/sheetService';

export function ensureAllSheets(): void {
  // ログ系を先に作る(以降の処理のログを記録できるようにする)
  ensureSheet('SYSTEM_LOG');
  for (const key of SHEET_ORDER) {
    ensureSheet(key);
  }
  reorderSheets();
  logger.info('ensureAllSheets', '全シートの存在とヘッダーを確認しました');
}
