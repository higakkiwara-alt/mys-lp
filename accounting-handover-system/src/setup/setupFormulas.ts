/**
 * 数式の設定
 * - ダッシュボードの集計数式(dashboardService に委譲)
 * - レシートの重複判定キー・重複候補の再計算
 * 数式は必要範囲だけを更新し、ユーザー入力列は触らない。
 */
import { logger } from '../utils/logger';
import { buildDedupKey } from '../utils/helpers';
import { rebuildDashboard } from '../services/dashboardService';
import { findDuplicateReceipts } from '../services/validationService';
import { colOf, findSheet } from '../services/sheetService';

/** レシート全行の重複判定キーと重複候補を再計算する */
export function recomputeReceiptDedup(): number {
  const sheet = findSheet('RECEIPT');
  if (!sheet) return 0;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const dateCol = colOf(sheet, '利用日');
  const vendorCol = colOf(sheet, '購入先');
  const amountCol = colOf(sheet, '金額');
  const userCol = colOf(sheet, '利用者');
  const keyCol = colOf(sheet, '重複判定キー');
  const dupCol = colOf(sheet, '重複候補');

  const n = lastRow - 1;
  const dates = sheet.getRange(2, dateCol, n, 1).getValues();
  const vendors = sheet.getRange(2, vendorCol, n, 1).getValues();
  const amounts = sheet.getRange(2, amountCol, n, 1).getValues();
  const users = sheet.getRange(2, userCol, n, 1).getValues();

  const keyed = dates.map((_, i) => ({
    rowNumber: i + 2,
    key: buildDedupKey(dates[i][0], vendors[i][0], amounts[i][0], users[i][0]),
  }));
  const dupMap = findDuplicateReceipts(keyed);
  const dupRows = new Set<number>();
  for (const rows of dupMap.values()) rows.forEach((r) => dupRows.add(r));

  sheet.getRange(2, keyCol, n, 1).setValues(keyed.map((k) => [k.key]));
  sheet.getRange(2, dupCol, n, 1).setValues(keyed.map((k) => [dupRows.has(k.rowNumber)]));
  return dupMap.size;
}

/** ダッシュボード数式を含む、数式全体の再設定 */
export function setupFormulas(): void {
  rebuildDashboard();
  const dupGroups = recomputeReceiptDedup();
  logger.info('setupFormulas', `数式を再設定しました(レシート重複グループ: ${dupGroups}件)`);
}
