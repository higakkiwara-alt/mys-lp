/**
 * n8n Webhook 連携サービス
 * 通知イベントを N8N_WEBHOOK_URL へ JSON POST する。
 * - URL未設定なら何もしない(メール通知とは独立)
 * - 失敗してもメイン処理を止めない(ログのみ)
 * - 書類の全文など機微情報は送らない(件名・件数・ID・期限のみ)
 */
import { getConfig, getIntegrationConfig } from '../config';
import type { NotificationItem } from '../types';
import { formatDateTime } from '../utils/helpers';
import { errorMessage } from '../utils/errors';
import { logger } from '../utils/logger';

/** Webhook ペイロードを組み立てる(純関数) */
export function buildWebhookPayload(
  title: string,
  items: NotificationItem[],
  mode: string,
  sentAt: string,
): Record<string, unknown> {
  return {
    source: 'otk-accounting-handover-system',
    event: 'notification',
    mode,
    title,
    count: items.length,
    sentAt,
    items: items.slice(0, 50).map((i) => ({
      manageId: i.manageId,
      content: String(i.content).slice(0, 200),
      deadline: i.deadline,
      assignee: i.assignee,
    })),
  };
}

/** Webhook を送信する。送信した場合 true */
export function notifyWebhook(title: string, items: NotificationItem[]): boolean {
  const ic = getIntegrationConfig();
  if (!ic.n8nWebhookUrl) return false;
  const cfg = getConfig();
  try {
    const payload = buildWebhookPayload(title, items, cfg.mode, formatDateTime(new Date()));
    const res = UrlFetchApp.fetch(ic.n8nWebhookUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const code = res.getResponseCode();
    if (code >= 300) {
      logger.warn('notifyWebhook', `Webhook応答が ${code} でした: ${title}`);
      return false;
    }
    return true;
  } catch (e) {
    logger.error('notifyWebhook', `Webhook送信に失敗: ${errorMessage(e)}`, e);
    return false;
  }
}
