/**
 * 明細突合サービス
 * 18_明細取込の「未突合」行に対して、04_請求書・支払管理 / 03_レシート・領収書管理 から
 * 金額が一致し日付が近いレコードを探し、「候補」として書き込む。
 * - 突合の確定は人間が行う(候補を確認して突合状況を「突合済み」にする)
 * - 既に関連管理IDが入っている行・未突合以外の行には触れない
 */
import type { RowRecord } from '../types';
import { daysBetween, formatDateTime, isBlank, toDate } from '../utils/helpers';
import { logger } from '../utils/logger';
import { colOf, ensureSheet, readRecords } from './sheetService';

/** 突合候補1件 */
export interface MatchCandidate {
  manageId: string;
  source: '請求書' | 'レシート';
  dateDiff: number; // 明細日付との差(日・絶対値)
  counterparty: string;
}

/** 日付の許容差(日) */
const MAX_DATE_DIFF = 7;

function s(v: unknown): string {
  return String(v ?? '').trim();
}

function amount(v: unknown): number | null {
  const n = Number(String(v ?? '').replace(/[,¥\s円]/g, ''));
  return isFinite(n) && n > 0 ? n : null;
}

/**
 * 1明細行に対する突合候補を探す(純関数・テスト対象)。
 * 金額が完全一致し、日付差が MAX_DATE_DIFF 日以内のものを日付差昇順で返す。
 * 明細の出金額は請求書・レシートと、入金額は(将来の売上突合用に)対象外とする。
 */
export function findMatchCandidates(
  statement: RowRecord,
  invoices: RowRecord[],
  receipts: RowRecord[],
): MatchCandidate[] {
  const stmtAmount = amount(statement['出金額']);
  const stmtDate = toDate(statement['日付']);
  if (stmtAmount === null || !stmtDate) return [];

  const candidates: MatchCandidate[] = [];

  for (const inv of invoices) {
    if (amount(inv['請求金額']) !== stmtAmount) continue;
    const d = toDate(inv['支払完了日']) ?? toDate(inv['支払予定日']) ?? toDate(inv['支払期限']);
    if (!d) continue;
    const diff = Math.abs(daysBetween(stmtDate, d));
    if (diff > MAX_DATE_DIFF) continue;
    candidates.push({
      manageId: s(inv['管理ID']),
      source: '請求書',
      dateDiff: diff,
      counterparty: s(inv['取引先']),
    });
  }

  for (const rct of receipts) {
    if (amount(rct['金額']) !== stmtAmount) continue;
    const d = toDate(rct['利用日']);
    if (!d) continue;
    const diff = Math.abs(daysBetween(stmtDate, d));
    if (diff > MAX_DATE_DIFF) continue;
    candidates.push({
      manageId: s(rct['管理ID']),
      source: 'レシート',
      dateDiff: diff,
      counterparty: s(rct['購入先']),
    });
  }

  return candidates
    .filter((c) => c.manageId !== '')
    .sort((a, b) => a.dateDiff - b.dateDiff)
    .slice(0, 3);
}

/** 候補を人間向けのメモ文字列にする(純関数) */
export function describeCandidates(candidates: MatchCandidate[]): string {
  if (candidates.length === 0) return '';
  const parts = candidates.map(
    (c) => `${c.manageId}(${c.source}/${c.counterparty}/日付差${c.dateDiff}日)`,
  );
  return `自動突合候補: ${parts.join('、')} → 確認して突合状況を「突合済み」にしてください`;
}

/**
 * 未突合の明細に突合候補を書き込む。
 * 最有力候補を「関連管理ID」へ、候補一覧を「備考」へ記入し、突合状況を「候補あり」にする。
 * 戻り値: 候補が見つかった明細行数
 */
export function suggestReconciliation(): number {
  const sheet = ensureSheet('STATEMENT');
  const statements = readRecords('STATEMENT');
  if (statements.length === 0) {
    logger.info('suggestReconciliation', '明細がありません(先に明細CSVを取り込んでください)');
    return 0;
  }
  const invoices = readRecords('INVOICE').map((r) => r.record);
  const receipts = readRecords('RECEIPT').map((r) => r.record);

  const idCol = colOf(sheet, '関連管理ID');
  const statusCol = colOf(sheet, '突合状況');
  const noteCol = colOf(sheet, '備考');

  let matched = 0;
  for (const { rowNumber, record } of statements) {
    if (s(record['突合状況']) !== '未突合') continue;
    if (!isBlank(record['関連管理ID'])) continue; // 手入力済みは尊重する
    const candidates = findMatchCandidates(record, invoices, receipts);
    if (candidates.length === 0) continue;
    sheet.getRange(rowNumber, idCol).setValue(candidates[0].manageId);
    sheet.getRange(rowNumber, statusCol).setValue('候補あり');
    sheet.getRange(rowNumber, noteCol).setValue(describeCandidates(candidates));
    matched++;
  }
  logger.info(
    'suggestReconciliation',
    `明細の突合候補検索が完了しました: ${matched} 行に候補を書き込みました(${formatDateTime(new Date())})`,
  );
  return matched;
}
