/**
 * 通知サービス
 * 期限超過・確認待ち・緊急案件などをメールで通知する。
 * - 通知先は Script Properties + 担当者マスター(通知対象)で管理
 * - 同じ内容の重複通知を防ぐ(内容ハッシュ+日付を CacheService/Properties に記録)
 * - テストモードでは件名に [テスト] を付ける
 */
import { getConfig, assertNotificationConfig } from '../config';
import type { NotificationItem } from '../types';
import { unique } from '../utils/helpers';
import { logger } from '../utils/logger';
import { getNotificationTargetEmails } from './masterDataService';
import { getSs } from './sheetService';
import { notifyWebhook } from './webhookService';

const DEDUP_PREFIX = 'NOTIFY_SENT_';
const DEDUP_HOURS = 20; // 同じ内容は約1日1回まで

/** 通知本文を組み立てる(純関数) */
export function buildNotificationBody(
  title: string,
  items: NotificationItem[],
  spreadsheetUrl: string,
): string {
  const lines: string[] = [
    `${title}`,
    `対象件数: ${items.length} 件`,
    '',
    ...items
      .slice(0, 50)
      .map(
        (i) =>
          `・[${i.manageId || 'IDなし'}] ${i.content}` +
          (i.deadline ? ` / 期限: ${i.deadline}` : '') +
          (i.assignee ? ` / 担当: ${i.assignee}` : ''),
      ),
  ];
  if (items.length > 50) lines.push(`…ほか ${items.length - 50} 件`);
  lines.push('', `スプレッドシート: ${spreadsheetUrl}`);
  lines.push('', 'このメールはOTK経理引き継ぎシステムから自動送信されています。');
  return lines.join('\n');
}

/** 内容から重複通知防止用のキーを作る(純関数) */
export function dedupKeyFor(title: string, items: NotificationItem[]): string {
  const ids = items
    .map((i) => i.manageId)
    .sort()
    .join(',');
  // 簡易ハッシュ(文字コード和。厳密さより安定性を優先)
  let hash = 0;
  const src = `${title}|${ids}`;
  for (let i = 0; i < src.length; i++) {
    hash = (hash * 31 + src.charCodeAt(0 + i)) | 0;
  }
  return `${DEDUP_PREFIX}${Math.abs(hash)}`;
}

function alreadySent(key: string): boolean {
  return CacheService.getScriptCache().get(key) !== null;
}

function markSent(key: string): void {
  CacheService.getScriptCache().put(key, '1', DEDUP_HOURS * 60 * 60);
}

/**
 * 通知を送信する。
 * @returns 送信した場合 true(通知無効・重複・対象0件の場合 false)
 */
export function sendNotification(
  title: string,
  items: NotificationItem[],
  extraRecipients: string[] = [],
): boolean {
  const cfg = getConfig();
  if (items.length === 0) return false;
  if (!cfg.notificationEnabled) {
    logger.info('sendNotification', `通知無効のため送信せず: ${title}(${items.length}件)`);
    return false;
  }
  const key = dedupKeyFor(title, items);
  if (alreadySent(key)) {
    logger.info('sendNotification', `重複のため送信せず: ${title}`);
    return false;
  }
  const recipients = unique(
    [
      cfg.ceoEmail,
      cfg.accountingEmail,
      ...getNotificationTargetEmails(),
      ...extraRecipients,
    ].filter((e) => e && e.includes('@')),
  );
  if (recipients.length === 0) {
    logger.warn('sendNotification', '通知先が未設定のため送信できません(README参照)');
    return false;
  }
  const subjectPrefix = cfg.mode === 'production' ? '' : '[テスト] ';
  const subject = `${subjectPrefix}【OTK経理】${title}(${items.length}件)`;
  const body = buildNotificationBody(title, items, getSs().getUrl());
  try {
    MailApp.sendEmail(recipients.join(','), subject, body);
    notifyWebhook(title, items); // n8n Webhook(未設定なら何もしない)
    markSent(key);
    logger.info(
      'sendNotification',
      `通知送信: ${title}(${items.length}件 → ${recipients.length}宛先)`,
    );
    return true;
  } catch (e) {
    logger.error('sendNotification', `メール送信に失敗しました: ${title}`, e);
    return false;
  }
}

/** 通知テスト(メニューから実行) */
export function sendTestNotification(): string {
  const cfg = getConfig();
  try {
    assertNotificationConfig(cfg);
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  const ok = sendNotification('通知テスト', [
    {
      manageId: 'TEST-0001',
      content: 'これは通知のテストです。受信できていれば設定は正常です。',
      deadline: '',
      assignee: '',
    },
  ]);
  return ok
    ? '通知テストを送信しました。受信を確認してください。'
    : '送信されませんでした(直近に同じテストを送信済みの可能性があります)。15_システムログを確認してください。';
}
