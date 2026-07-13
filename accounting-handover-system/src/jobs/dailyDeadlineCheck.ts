/**
 * 毎日の期限チェックジョブ(時間主導トリガー)
 * 不整合チェック結果と各シートの状態から通知を送る。
 * 通知はカテゴリごとに分け、同内容の再通知は notificationService 側で抑止される。
 */
import { getConfig } from '../config';
import { STATUS } from '../constants';
import type { NotificationItem } from '../types';
import { logger } from '../utils/logger';
import { errorMessage } from '../utils/errors';
import { updateDashboard } from '../services/dashboardService';
import { sendNotification } from '../services/notificationService';
import { readRecords } from '../services/sheetService';
import { runIntegrityCheck } from './dataIntegrityCheck';
import {
  buildMonthlyCloseOverdue,
  buildQuestionReminders,
  buildStatusReminders,
  buildUrgentItems,
} from './reminderNotification';

export function runDailyDeadlineCheck(): void {
  const cfg = getConfig();
  try {
    // 1. 不整合チェック(期限超過・支払期限接近・契約期限接近を含む)
    const result = runIntegrityCheck();
    const byType = (types: string[]): NotificationItem[] =>
      result.issues
        .filter((i) => types.includes(i.type))
        .map((i) => ({ manageId: i.manageId, content: i.problem, deadline: '', assignee: '' }));

    sendNotification('期限超過の案件があります', byType(['期限超過']));
    sendNotification(
      `支払期限が${cfg.deadlineWarnDays}日以内の請求書があります`,
      byType(['支払期限接近']),
    );
    sendNotification(
      '契約の更新・解約通知期限が近づいています',
      byType(['契約更新・解約期限接近']),
    );

    // 2. 確認待ちリマインド
    const intake = readRecords('INTAKE').map((r) => r.record);
    sendNotification('代表確認待ちの書類があります', buildStatusReminders(intake, STATUS.WAIT_CEO));
    sendNotification(
      '税理士確認待ちの書類があります',
      buildStatusReminders(intake, STATUS.WAIT_TAX),
      [cfg.taxAccountantEmail].filter(Boolean),
    );
    sendNotification(
      '社労士確認待ちの書類があります',
      buildStatusReminders(intake, STATUS.WAIT_LABOR),
      [cfg.laborConsultantEmail].filter(Boolean),
    );

    // 3. 緊急案件
    sendNotification('重要度「緊急」の未完了案件があります', buildUrgentItems(intake));

    // 4. 月次締め未完了・質問期限
    const monthly = readRecords('MONTHLY_CLOSE').map((r) => r.record);
    sendNotification(
      '月次締めチェックリストに期限超過があります',
      buildMonthlyCloseOverdue(monthly, new Date()),
    );
    const questions = readRecords('QUESTION').map((r) => r.record);
    sendNotification(
      '回答期限が近い質問があります',
      buildQuestionReminders(questions, new Date(), cfg.deadlineWarnDays),
    );

    // 5. データ不整合(新規があれば)
    if (result.added > 0) {
      sendNotification(
        'データ不整合が新たに検出されました',
        result.issues.slice(0, 50).map((i) => ({
          manageId: i.manageId,
          content: `[${i.type}] ${i.problem}`,
          deadline: '',
          assignee: '',
        })),
      );
    }

    // 6. ダッシュボード更新日時
    updateDashboard();
    logger.info('runDailyDeadlineCheck', '毎日の期限チェックが完了しました');
  } catch (e) {
    logger.error('runDailyDeadlineCheck', `期限チェックでエラー: ${errorMessage(e)}`, e);
  }
}
