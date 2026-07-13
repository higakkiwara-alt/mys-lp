/**
 * リマインド通知の組み立て
 * 確認待ちステータス(代表・税理士・社労士)や緊急案件、月次締め未完了を
 * 通知アイテムに変換する。送信は notificationService が行う。
 */
import { STATUS } from '../constants';
import type { NotificationItem, RowRecord } from '../types';
import { daysBetween, isBlank, toDate } from '../utils/helpers';

function s(v: unknown): string {
  return String(v ?? '').trim();
}

function toItem(
  r: RowRecord,
  idHeader: string,
  contentHeader: string,
  deadlineHeader: string,
  assigneeHeader: string,
): NotificationItem {
  return {
    manageId: s(r[idHeader]),
    content: s(r[contentHeader]),
    deadline: s(r[deadlineHeader]),
    assignee: s(r[assigneeHeader]),
  };
}

/** 指定ステータスの台帳項目(純関数) */
export function buildStatusReminders(intake: RowRecord[], status: string): NotificationItem[] {
  return intake
    .filter((r) => s(r['現在のステータス']) === status)
    .map((r) => toItem(r, '管理ID', '書類名・内容', '対応期限', '処理担当者'));
}

/** 重要度「緊急」の未完了案件(純関数) */
export function buildUrgentItems(intake: RowRecord[]): NotificationItem[] {
  return intake
    .filter(
      (r) =>
        s(r['重要度']) === '緊急' &&
        s(r['現在のステータス']) !== STATUS.DONE &&
        s(r['現在のステータス']) !== STATUS.NO_ACTION,
    )
    .map((r) => toItem(r, '管理ID', '書類名・内容', '対応期限', '処理担当者'));
}

/** 月次締め未完了(期限超過)項目(純関数) */
export function buildMonthlyCloseOverdue(
  monthlyClose: RowRecord[],
  today: Date,
): NotificationItem[] {
  return monthlyClose
    .filter((r) => {
      const state = s(r['実施状況']);
      if (state === '完了' || state === '対象外') return false;
      const due = toDate(r['期限']);
      return !!due && daysBetween(due, today) > 0;
    })
    .map((r) => ({
      manageId: s(r['チェックID']),
      content: `${s(r['対象年月'])} ${s(r['チェック項目'])}(${s(r['対象店舗'])})`,
      deadline: s(r['期限']),
      assignee: s(r['担当者']),
    }));
}

/** 回答期限が近い・過ぎた未回答の質問(純関数) */
export function buildQuestionReminders(
  questions: RowRecord[],
  today: Date,
  warnDays: number,
): NotificationItem[] {
  return questions
    .filter((r) => {
      if (!isBlank(r['回答内容'])) return false;
      const status = s(r['ステータス']);
      if (status === STATUS.DONE || status === STATUS.NO_ACTION) return false;
      const due = toDate(r['回答期限']);
      return !!due && daysBetween(today, due) <= warnDays;
    })
    .map((r) => ({
      manageId: s(r['質問ID']),
      content: s(r['質問内容']).slice(0, 60),
      deadline: s(r['回答期限']),
      assignee: s(r['確認先']),
    }));
}
