/**
 * 月次経営レポート・店舗別損益集計ジョブ
 * 17_売上データ取込(売上)・03_レシート(経費)・04_請求書(経費)を
 * 対象年月×店舗で集計し、19_店舗別月次集計 へ洗い替えで書き込み、
 * 代表へレポートメールを送る。
 * 管理会計目的の概算であり、税務上の数値は税理士が確定する。
 */
import { COMPANY_WIDE } from '../constants';
import type { NotificationItem, RowRecord } from '../types';
import { formatDate, formatDateTime, toDate } from '../utils/helpers';
import { logger } from '../utils/logger';
import { sendNotification } from '../services/notificationService';
import { ensureSheet, readRecords } from '../services/sheetService';

export interface StorePL {
  ym: string;
  store: string;
  sales: number;
  receiptCost: number;
  invoiceCost: number;
  profit: number;
  salesCount: number;
  costCount: number;
}

function s(v: unknown): string {
  return String(v ?? '').trim();
}

function num(v: unknown): number {
  const n = Number(String(v ?? '').replace(/[,¥\s円]/g, ''));
  return isFinite(n) ? n : 0;
}

function ymOf(dateValue: unknown): string {
  const d = toDate(dateValue);
  return d ? formatDate(d).slice(0, 7) : '';
}

/** 店舗別月次損益を集計する(純関数・テスト対象) */
export function aggregateStorePL(
  ym: string,
  squareSales: RowRecord[],
  receipts: RowRecord[],
  invoices: RowRecord[],
): StorePL[] {
  const map = new Map<string, StorePL>();
  const get = (store: string): StorePL => {
    const key = store || COMPANY_WIDE;
    let cur = map.get(key);
    if (!cur) {
      cur = {
        ym,
        store: key,
        sales: 0,
        receiptCost: 0,
        invoiceCost: 0,
        profit: 0,
        salesCount: 0,
        costCount: 0,
      };
      map.set(key, cur);
    }
    return cur;
  };

  for (const r of squareSales) {
    if (ymOf(r['日付']) !== ym) continue;
    const pl = get(s(r['店舗']));
    pl.sales += num(r['売上金額']);
    pl.salesCount += num(r['取引件数']);
  }
  for (const r of receipts) {
    if (ymOf(r['利用日']) !== ym) continue;
    const pl = get(s(r['対象店舗']));
    pl.receiptCost += num(r['金額']);
    pl.costCount += 1;
  }
  for (const r of invoices) {
    const date = r['支払完了日'] ?? r['請求日'] ?? r['請求書受領日'];
    if (ymOf(date) !== ym) continue;
    const pl = get(s(r['対象店舗']));
    pl.invoiceCost += num(r['請求金額']);
    pl.costCount += 1;
  }

  for (const pl of map.values()) {
    pl.profit = pl.sales - pl.receiptCost - pl.invoiceCost;
  }
  return Array.from(map.values()).sort((a, b) => a.store.localeCompare(b.store, 'ja'));
}

/** 指定年月のレポートを生成する。戻り値: 店舗数 */
export function generateMonthlyReport(ym: string, notify = true): number {
  const data = aggregateStorePL(
    ym,
    readRecords('SQUARE_SALES').map((r) => r.record),
    readRecords('RECEIPT').map((r) => r.record),
    readRecords('INVOICE').map((r) => r.record),
  );

  const sheet = ensureSheet('STORE_PL');
  // 同一年月の既存行を洗い替え(下から削除して行ズレを防ぐ)
  const existing = readRecords('STORE_PL');
  for (let i = existing.length - 1; i >= 0; i--) {
    if (s(existing[i].record['対象年月']) === ym) sheet.deleteRow(existing[i].rowNumber);
  }

  const nowStr = formatDateTime(new Date());
  if (data.length > 0) {
    const rows = data.map((pl) => [
      `${pl.ym}|${pl.store}`,
      pl.ym,
      pl.store,
      pl.sales,
      pl.receiptCost,
      pl.invoiceCost,
      pl.profit,
      pl.salesCount,
      pl.costCount,
      nowStr,
      '概算(管理会計用)。税務上の数値は税理士確認必要',
    ]);
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }

  if (notify && data.length > 0) {
    const items: NotificationItem[] = data.map((pl) => ({
      manageId: pl.store,
      content: `売上 ¥${pl.sales.toLocaleString()} / 経費 ¥${(pl.receiptCost + pl.invoiceCost).toLocaleString()} / 粗利 ¥${pl.profit.toLocaleString()}`,
      deadline: '',
      assignee: '',
    }));
    sendNotification(`${ym} 月次経営レポート(概算)`, items);
  }

  logger.info('generateMonthlyReport', `${ym} の店舗別月次集計を生成しました(${data.length}店舗)`);
  return data.length;
}

/** トリガー用: 前月分のレポートを生成 */
export function runMonthlyReportJob(): void {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const ym = formatDate(prev).slice(0, 7);
  generateMonthlyReport(ym);
}
