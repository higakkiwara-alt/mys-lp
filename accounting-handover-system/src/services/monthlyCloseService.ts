/**
 * 月次締めチェックリストサービス
 * 指定年月のチェックリストを生成する。同じ 年月+店舗+項目 は重複生成しない(冪等)。
 */
import { CHECKLIST_ITEMS, COMPANY_WIDE, SHEETS } from '../constants';
import type { ChecklistItemDef } from '../types';
import { formatDate, formatDateTime, pad } from '../utils/helpers';
import { logger } from '../utils/logger';
import { withScriptLock } from '../utils/lock';
import { formatId, nextSequence } from './idService';
import { getActiveStoreNames } from './masterDataService';
import { ensureSheet, headerMap, readRecords } from './sheetService';

export interface ChecklistRow {
  yearMonth: string; // 'YYYY-MM'
  item: string;
  store: string;
  deadline: string; // 'yyyy-MM-dd'
}

/**
 * 生成すべきチェックリスト行を計算する(純関数・テスト対象)
 * @param year 対象年
 * @param month 対象月(1-12)
 * @param stores 有効店舗名一覧
 * @param existingKeys 既存の「年月|店舗|項目」キー集合
 */
export function buildChecklistRows(
  year: number,
  month: number,
  stores: string[],
  existingKeys: Set<string>,
  items: ChecklistItemDef[] = CHECKLIST_ITEMS,
): ChecklistRow[] {
  const ym = `${year}-${pad(month, 2)}`;
  // 期限は翌月 dueDay 日
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const rows: ChecklistRow[] = [];
  for (const def of items) {
    const targets = def.scope === 'store' ? stores : [COMPANY_WIDE];
    for (const store of targets) {
      const key = `${ym}|${store}|${def.item}`;
      if (existingKeys.has(key)) continue;
      const deadline = formatDate(new Date(next.y, next.m - 1, def.dueDay));
      rows.push({ yearMonth: ym, item: def.item, store, deadline });
    }
  }
  return rows;
}

/** 既存チェックリストのキー集合(年月|店舗|項目)を作る */
export function existingChecklistKeys(records: Array<Record<string, unknown>>): Set<string> {
  const set = new Set<string>();
  for (const r of records) {
    const ym = String(r['対象年月'] ?? '').trim();
    const store = String(r['対象店舗'] ?? '').trim();
    const item = String(r['チェック項目'] ?? '').trim();
    if (ym && item) set.add(`${ym}|${store}|${item}`);
  }
  return set;
}

/** 指定年月のチェックリストをシートへ生成する。戻り値は追加件数 */
export function generateChecklist(year: number, month: number): number {
  return withScriptLock(() => {
    const sheet = ensureSheet('MONTHLY_CLOSE');
    const existing = existingChecklistKeys(readRecords('MONTHLY_CLOSE').map((r) => r.record));
    const stores = getActiveStoreNames();
    if (stores.length === 0) {
      logger.warn(
        'generateChecklist',
        '稼働中の店舗が11_店舗・事業マスターにありません。全社項目のみ生成します。',
      );
    }
    const rows = buildChecklistRows(year, month, stores, existing);
    if (rows.length === 0) return 0;

    const map = headerMap(sheet);
    const lastCol = sheet.getLastColumn();
    const idPrefix = SHEETS.MONTHLY_CLOSE.idPrefix!;
    const ymPart = `${year}${pad(month, 2)}`;
    const lastRow = sheet.getLastRow();
    const ids =
      lastRow >= 2
        ? sheet
            .getRange(2, 1, lastRow - 1, 1)
            .getValues()
            .map((r) => String(r[0]))
        : [];
    let seq = nextSequence(ids, idPrefix, ymPart);
    const nowStr = formatDateTime(new Date());

    const values = rows.map((row) => {
      const arr: unknown[] = new Array(lastCol).fill('');
      const set = (header: string, v: unknown): void => {
        const col = map[header];
        if (col) arr[col - 1] = v;
      };
      set('チェックID', formatId(idPrefix, ymPart, seq++));
      set('対象年月', row.yearMonth);
      set('チェック項目', row.item);
      set('対象店舗', row.store);
      set('期限', row.deadline);
      set('実施状況', '未実施');
      set('登録日時', nowStr);
      return arr;
    });
    sheet.getRange(sheet.getLastRow() + 1, 1, values.length, lastCol).setValues(values);
    logger.info(
      'generateChecklist',
      `${year}-${pad(month, 2)} のチェックリストを ${values.length} 件生成しました`,
    );
    return values.length;
  });
}

/** 指定年月の進捗率(完了/全体)。データが無ければ null(純関数) */
export function closeProgress(
  records: Array<Record<string, unknown>>,
  ym: string,
): { done: number; total: number; rate: number } | null {
  const target = records.filter((r) => String(r['対象年月'] ?? '').trim() === ym);
  if (target.length === 0) return null;
  const done = target.filter((r) => String(r['実施状況'] ?? '').trim() === '完了').length;
  return { done, total: target.length, rate: Math.round((done / target.length) * 100) };
}
