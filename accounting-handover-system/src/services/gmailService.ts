/**
 * Gmail 添付請求書の自動受付サービス
 * 検索クエリに一致するメールの添付(PDF/画像)を Drive の 00_未分類・新規受付 へ保存し、
 * 02_書類受付台帳 へ登録する。
 * - 処理済みメッセージIDは 21_Gmail取込 に記録し、二重取込しない(冪等)
 * - メールの削除・既読化・ラベル変更は行わない(gmail.readonly 相当の運用)
 */
import { SHEETS } from '../constants';
import { getIntegrationConfig } from '../config';
import { formatDate, formatDateTime } from '../utils/helpers';
import { errorMessage } from '../utils/errors';
import { logger } from '../utils/logger';
import { ensureRootFolder } from './driveService';
import { assignIdToRow } from './idService';
import { appendRecord, readRecords } from './sheetService';

const MAX_THREADS_PER_RUN = 20;
const TARGET_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/heic'];

/** 件名・差出人から台帳の書類名を組み立てる(純関数) */
export function buildIntakeTitleFromMail(subject: string, from: string): string {
  const cleanSubject =
    String(subject ?? '')
      .replace(/\s+/g, ' ')
      .trim() || '(件名なし)';
  const sender = String(from ?? '')
    .replace(/<.*>/, '')
    .trim();
  return `メール受付: ${cleanSubject}(${sender})`.slice(0, 100);
}

/** Gmail から請求書らしきメールを取り込む。戻り値: 取り込んだ添付数 */
export function importInvoicesFromGmail(): number {
  const ic = getIntegrationConfig();
  if (!ic.gmailImportEnabled) {
    logger.info(
      'importInvoicesFromGmail',
      'Gmail取込は無効です(Script Properties の GMAIL_IMPORT_ENABLED を true に設定すると有効になります)',
    );
    return 0;
  }

  const processed = new Set(
    readRecords('GMAIL_LOG').map((r) => String(r.record['メッセージID'] ?? '').trim()),
  );

  const root = ensureRootFolder();
  const inboxIt = root.getFoldersByName('00_未分類・新規受付');
  const inboxFolder = inboxIt.hasNext() ? inboxIt.next() : root.createFolder('00_未分類・新規受付');

  let imported = 0;
  const threads = GmailApp.search(ic.gmailSearchQuery, 0, MAX_THREADS_PER_RUN);
  for (const thread of threads) {
    for (const message of thread.getMessages()) {
      const msgId = message.getId();
      if (processed.has(msgId)) continue;
      processed.add(msgId);
      try {
        const attachments = message
          .getAttachments()
          .filter((a) => TARGET_MIME.includes(a.getContentType()));
        const gmailLink = `https://mail.google.com/mail/u/0/#all/${msgId}`;
        const savedNames: string[] = [];
        let firstFileUrl = '';

        for (const att of attachments) {
          const file = inboxFolder.createFile(att.copyBlob());
          file.setName(`${formatDate(new Date(message.getDate().getTime()))}_${att.getName()}`);
          savedNames.push(file.getName());
          if (!firstFileUrl) firstFileUrl = file.getUrl();
        }

        let manageId = '';
        if (attachments.length > 0) {
          // 台帳へ1メール=1行で登録(添付が複数でも1案件として扱う)
          const rowNumber = appendRecord('INTAKE', {
            受付日: formatDate(new Date()),
            書類種別: '請求書',
            '書類名・内容': buildIntakeTitleFromMail(message.getSubject(), message.getFrom()),
            '発行元・取引先': message.getFrom().replace(/<.*>/, '').trim(),
            原本形式: 'メール',
            'Google Driveリンク': firstFileUrl,
            Gmailリンク: gmailLink,
            現在のステータス: '未確認',
            次の対応: '添付を確認し、金額・支払期限・店舗を入力してください',
            重要度: '中',
            備考: 'Gmail自動取込',
            登録日時: formatDateTime(new Date()),
          });
          manageId = assignIdToRow('INTAKE', rowNumber);
          imported += attachments.length;
        }

        appendRecord('GMAIL_LOG', {
          メッセージID: msgId,
          受信日時: formatDateTime(new Date(message.getDate().getTime())),
          差出人: message.getFrom(),
          件名: message.getSubject(),
          添付ファイル名: savedNames.join(', '),
          Driveリンク: firstFileUrl,
          Gmailリンク: gmailLink,
          台帳管理ID: manageId,
          取込状況: attachments.length > 0 ? '取込済み' : '対象添付なし',
          取込日時: formatDateTime(new Date()),
        });
      } catch (e) {
        // 1通の失敗で全体を止めない
        logger.error('importInvoicesFromGmail', `メッセージ処理に失敗: ${errorMessage(e)}`, e);
        appendRecord('GMAIL_LOG', {
          メッセージID: msgId,
          件名: '(処理失敗)',
          取込状況: 'エラー',
          取込日時: formatDateTime(new Date()),
          備考: errorMessage(e).slice(0, 200),
        });
      }
    }
  }
  logger.info(
    'importInvoicesFromGmail',
    `Gmail取込完了: 添付 ${imported} 件を ${SHEETS.INTAKE.name} へ登録しました`,
  );
  return imported;
}
