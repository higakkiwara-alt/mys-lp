/**
 * 会計ソフト連携(仕訳候補CSVエクスポート)サービス
 * 03_レシート・領収書管理 と 04_請求書・支払管理 から、指定年月の仕訳「候補」を
 * CSVに出力して Drive の 10_月次締め/YYYY-MM へ保存する。
 * - 勘定科目・税区分はあくまで候補。会計ソフトへの自動登録は行わない
 *   (freee / マネーフォワードのインポート画面で人間が確認して取り込む)
 * - 将来のAPI直接連携は docs/integration-guide.md の構想を参照
 */
import type { RowRecord } from '../types';
import { toCsv } from '../utils/csv';
import { formatDate, isBlank, toDate } from '../utils/helpers';
import { logger } from '../utils/logger';
import { ensureRootFolder } from './driveService';
import { readRecords } from './sheetService';

export const JOURNAL_HEADERS = [
  '日付',
  '金額',
  '勘定科目候補',
  '税区分候補',
  '取引先',
  '摘要',
  '店舗',
  '支払方法',
  'インボイス登録番号',
  '管理ID',
  '出典シート',
];

function s(v: unknown): string {
  return String(v ?? '').trim();
}

/** 対象年月('YYYY-MM')に該当するか(日付列から判定) */
function inMonth(dateValue: unknown, ym: string): boolean {
  const d = toDate(dateValue);
  if (!d) return false;
  return formatDate(d).slice(0, 7) === ym;
}

/** レシート・請求書から仕訳候補行を作る(純関数・テスト対象) */
export function buildJournalRows(
  receipts: RowRecord[],
  invoices: RowRecord[],
  ym: string,
): unknown[][] {
  const rows: unknown[][] = [];
  for (const r of receipts) {
    if (!inMonth(r['利用日'], ym)) continue;
    if (isBlank(r['金額'])) continue;
    rows.push([
      formatDate(toDate(r['利用日'])!),
      r['金額'],
      s(r['勘定科目候補']),
      s(r['税区分候補']),
      s(r['購入先']),
      s(r['内容']) || s(r['利用目的']),
      s(r['対象店舗']),
      s(r['支払方法']),
      s(r['インボイス登録番号']),
      s(r['管理ID']),
      'レシート',
    ]);
  }
  for (const r of invoices) {
    const date = toDate(r['支払完了日']) ?? toDate(r['請求日']) ?? toDate(r['請求書受領日']);
    if (!date || formatDate(date).slice(0, 7) !== ym) continue;
    if (isBlank(r['請求金額'])) continue;
    rows.push([
      formatDate(date),
      r['請求金額'],
      '',
      '',
      s(r['取引先']),
      s(r['請求内容']),
      s(r['対象店舗']),
      s(r['支払方法']),
      '',
      s(r['管理ID']),
      '請求書',
    ]);
  }
  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return rows;
}

/** 仕訳候補CSVを生成して Drive へ保存する。戻り値: ファイルURL(0件なら空文字) */
export function exportJournalCandidates(ym: string): { url: string; count: number } {
  const receipts = readRecords('RECEIPT').map((r) => r.record);
  const invoices = readRecords('INVOICE').map((r) => r.record);
  const rows = buildJournalRows(receipts, invoices, ym);
  if (rows.length === 0) {
    logger.warn('exportJournalCandidates', `${ym} の仕訳候補は0件でした`);
    return { url: '', count: 0 };
  }

  const root = ensureRootFolder();
  const closeIt = root.getFoldersByName('10_月次締め');
  const closeFolder = closeIt.hasNext() ? closeIt.next() : root.createFolder('10_月次締め');
  const ymIt = closeFolder.getFoldersByName(ym);
  const ymFolder = ymIt.hasNext() ? ymIt.next() : closeFolder.createFolder(ym);

  const csv = toCsv([JOURNAL_HEADERS, ...rows]);
  const fileName = `${ym}_仕訳候補_${formatDate(new Date())}.csv`;
  // 同名ファイルがあれば別名で保存(上書きしない)
  const exists = ymFolder.getFilesByName(fileName).hasNext();
  const finalName = exists ? fileName.replace('.csv', `_${Date.now() % 100000}.csv`) : fileName;
  const file = ymFolder.createFile(finalName, csv, 'text/csv');

  logger.info(
    'exportJournalCandidates',
    `仕訳候補CSVを出力しました: ${ym} / ${rows.length}行(勘定科目・税区分は候補。税理士確認必要)`,
  );
  return { url: file.getUrl(), count: rows.length };
}
