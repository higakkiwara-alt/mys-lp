import { describe, expect, it } from 'vitest';
import {
  buildChecklistRows,
  closeProgress,
  existingChecklistKeys,
} from '../src/services/monthlyCloseService';
import { CHECKLIST_ITEMS, COMPANY_WIDE } from '../src/constants';

describe('buildChecklistRows', () => {
  const stores = ['店舗A', '店舗B'];

  it('店舗項目は店舗ごと、全社項目は1件だけ生成する', () => {
    const rows = buildChecklistRows(2026, 7, stores, new Set());
    const storeItems = CHECKLIST_ITEMS.filter((i) => i.scope === 'store').length;
    const companyItems = CHECKLIST_ITEMS.filter((i) => i.scope === 'company').length;
    expect(rows).toHaveLength(storeItems * stores.length + companyItems);
    expect(rows.every((r) => r.yearMonth === '2026-07')).toBe(true);
    expect(rows.some((r) => r.store === COMPANY_WIDE)).toBe(true);
  });

  it('既存キーと重複する行は生成しない(冪等)', () => {
    const first = buildChecklistRows(2026, 7, stores, new Set());
    const keys = new Set(first.map((r) => `${r.yearMonth}|${r.store}|${r.item}`));
    const second = buildChecklistRows(2026, 7, stores, keys);
    expect(second).toHaveLength(0);
  });

  it('期限は翌月の指定日になる(12月は年をまたぐ)', () => {
    const rows = buildChecklistRows(2026, 12, ['店舗A'], new Set());
    expect(rows.every((r) => r.deadline.startsWith('2027-01'))).toBe(true);
  });

  it('店舗が無い場合は全社項目のみ生成する', () => {
    const rows = buildChecklistRows(2026, 7, [], new Set());
    expect(rows.every((r) => r.store === COMPANY_WIDE)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe('existingChecklistKeys', () => {
  it('対象年月|店舗|項目 のキー集合を作る', () => {
    const keys = existingChecklistKeys([
      { 対象年月: '2026-07', 対象店舗: '店舗A', チェック項目: 'レシート回収' },
      { 対象年月: '', 対象店舗: '店舗A', チェック項目: '無視される' },
    ]);
    expect(keys.has('2026-07|店舗A|レシート回収')).toBe(true);
    expect(keys.size).toBe(1);
  });
});

describe('closeProgress', () => {
  it('完了率を計算する', () => {
    const records = [
      { 対象年月: '2026-07', 実施状況: '完了' },
      { 対象年月: '2026-07', 実施状況: '未実施' },
      { 対象年月: '2026-07', 実施状況: '完了' },
      { 対象年月: '2026-06', 実施状況: '完了' },
    ];
    expect(closeProgress(records, '2026-07')).toEqual({ done: 2, total: 3, rate: 67 });
  });

  it('対象データが無ければ null', () => {
    expect(closeProgress([], '2026-07')).toBeNull();
  });
});
