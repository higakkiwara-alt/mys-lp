/**
 * 月次チェックリスト生成ジョブ
 * 毎月1日の時間主導トリガーで当月分を自動生成する。
 * 手動実行(メニュー)では対象年月を指定できる。
 */
import { errorMessage } from '../utils/errors';
import { logger } from '../utils/logger';
import { generateChecklist } from '../services/monthlyCloseService';

/** トリガー用: 当月分を生成 */
export function runMonthlyChecklistGeneration(): void {
  try {
    const now = new Date();
    const added = generateChecklist(now.getFullYear(), now.getMonth() + 1);
    logger.info(
      'runMonthlyChecklistGeneration',
      `当月の月次チェックリストを生成しました(追加 ${added} 件)`,
    );
  } catch (e) {
    logger.error(
      'runMonthlyChecklistGeneration',
      `月次チェックリスト生成でエラー: ${errorMessage(e)}`,
      e,
    );
  }
}
