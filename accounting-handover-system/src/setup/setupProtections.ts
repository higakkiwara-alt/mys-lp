/**
 * シート保護の設定(冪等)
 * マスター・履歴・ログ・ダッシュボードへ「警告表示」の保護を掛ける。
 * 完全な行単位・ユーザー単位の権限制御はスプレッドシートの仕様上できないため、
 * 運用ルール(docs/permission-design.md)と併用する。
 */
import { SHEETS, SHEET_ORDER } from '../constants';
import { logger } from '../utils/logger';
import { findSheet } from '../services/sheetService';

const PROTECTION_NOTE = 'OTK経理システムによる保護(警告のみ)';

export function setupProtections(): void {
  for (const key of SHEET_ORDER) {
    const def = SHEETS[key];
    if (!def.protect) continue;
    const sheet = findSheet(key);
    if (!sheet) continue;
    const existing = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    if (existing.some((p) => p.getDescription() === PROTECTION_NOTE)) continue; // 冪等
    const protection = sheet.protect();
    protection.setDescription(PROTECTION_NOTE);
    protection.setWarningOnly(true);
  }
  logger.info('setupProtections', '保護(警告表示)を設定しました');
}
