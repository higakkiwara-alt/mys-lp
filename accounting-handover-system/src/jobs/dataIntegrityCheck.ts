/**
 * データ不整合チェックジョブ
 * 手動(メニュー)と定期(毎日)の両方から実行される。
 * - 検出結果は 16_エラー・不整合一覧 へ出力
 * - 同じ不整合(種別+シート+管理ID)は重複登録しない
 * - 解消された不整合は「解消済み」に更新する
 */
import { getConfig } from '../config';
import type { IntegrityIssue } from '../types';
import { formatDate, formatDateTime } from '../utils/helpers';
import { logger } from '../utils/logger';
import { detectIssues, issueKey } from '../services/validationService';
import { getActiveStaffNames, getAllStoreNames } from '../services/masterDataService';
import { colOf, ensureSheet, readRecords } from '../services/sheetService';

const RESOLVED_STATES = ['解消済み', '対応済み', '対象外'];

export interface IntegrityRunResult {
  detected: number;
  added: number;
  resolved: number;
  issues: IntegrityIssue[];
}

export function runIntegrityCheck(): IntegrityRunResult {
  const cfg = getConfig();
  const issues = detectIssues({
    intake: readRecords('INTAKE').map((r) => r.record),
    receipts: readRecords('RECEIPT').map((r) => r.record),
    invoices: readRecords('INVOICE').map((r) => r.record),
    contracts: readRecords('CONTRACT').map((r) => r.record),
    questions: readRecords('QUESTION').map((r) => r.record),
    monthlyClose: readRecords('MONTHLY_CLOSE').map((r) => r.record),
    storeNames: getAllStoreNames(),
    staffNames: getActiveStaffNames(),
    today: new Date(),
    warnDays: cfg.deadlineWarnDays,
    contractWarnDays: cfg.contractWarnDays,
  });

  const sheet = ensureSheet('ERROR_LIST');
  const existing = readRecords('ERROR_LIST');
  const stateCol = colOf(sheet, '対応状況');
  const doneCol = colOf(sheet, '完了日');

  // 未解決の既存行: キー → 行番号
  const openExisting = new Map<string, number>();
  for (const { rowNumber, record } of existing) {
    const state = String(record['対応状況'] ?? '').trim();
    if (RESOLVED_STATES.includes(state)) continue;
    const key = issueKey({
      type: String(record['不整合種別'] ?? ''),
      sheetName: String(record['対象シート'] ?? ''),
      manageId: String(record['管理ID'] ?? ''),
    });
    openExisting.set(key, rowNumber);
  }

  const detectedKeys = new Set(issues.map((i) => issueKey(i)));

  // 新規の不整合を追加
  const nowStr = formatDateTime(new Date());
  const newIssues = issues.filter((i) => !openExisting.has(issueKey(i)));
  if (newIssues.length > 0) {
    const rows = newIssues.map((i) => [
      nowStr,
      i.type,
      i.severity,
      i.sheetName,
      i.manageId,
      i.problem,
      i.fix,
      '',
      '未対応',
      '',
    ]);
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }

  // 解消された不整合を更新
  let resolved = 0;
  const today = formatDate(new Date());
  for (const [key, rowNumber] of openExisting) {
    if (detectedKeys.has(key)) continue;
    sheet.getRange(rowNumber, stateCol).setValue('解消済み');
    sheet.getRange(rowNumber, doneCol).setValue(today);
    resolved++;
  }

  logger.info(
    'runIntegrityCheck',
    `不整合チェック完了: 検出 ${issues.length} / 新規 ${newIssues.length} / 解消 ${resolved}`,
  );
  return { detected: issues.length, added: newIssues.length, resolved, issues };
}
