import { describe, expect, it } from 'vitest';
import { describeCandidates, findMatchCandidates } from '../src/services/reconcileService';

const invoices = [
  { 管理ID: 'INV-1', 請求金額: 55000, 支払完了日: '2026-07-10', 取引先: '広告社' },
  { 管理ID: 'INV-2', 請求金額: 55000, 支払期限: '2026-07-25', 取引先: '別の広告社' },
  { 管理ID: 'INV-3', 請求金額: 99999, 支払完了日: '2026-07-10', 取引先: '金額違い' },
];
const receipts = [
  { 管理ID: 'RCT-1', 金額: 12800, 利用日: '2026-07-09', 購入先: '材料屋' },
  { 管理ID: 'RCT-2', 金額: 12800, 利用日: '2026-06-01', 購入先: '日付が遠い' },
];

describe('findMatchCandidates', () => {
  it('金額一致+日付差7日以内の請求書を日付差の近い順に返す', () => {
    const stmt = { 日付: '2026-07-10', 摘要: '振込', 出金額: 55000 };
    const c = findMatchCandidates(stmt, invoices, receipts);
    expect(c.map((x) => x.manageId)).toEqual(['INV-1']); // INV-2は日付差15日で対象外
    expect(c[0]).toMatchObject({ source: '請求書', dateDiff: 0, counterparty: '広告社' });
  });

  it('レシートも候補になり、日付差でソートされる', () => {
    const stmt = { 日付: '2026-07-10', 摘要: 'カード利用', 出金額: 12800 };
    const c = findMatchCandidates(stmt, invoices, receipts);
    expect(c.map((x) => x.manageId)).toEqual(['RCT-1']); // RCT-2は日付が遠い
    expect(c[0].source).toBe('レシート');
  });

  it('出金額が無い明細(入金)や日付不正は候補を返さない', () => {
    expect(
      findMatchCandidates({ 日付: '2026-07-10', 入金額: 55000, 出金額: '' }, invoices, receipts),
    ).toEqual([]);
    expect(findMatchCandidates({ 日付: 'なし', 出金額: 55000 }, invoices, receipts)).toEqual([]);
  });

  it('候補は最大3件まで', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      管理ID: `INV-${i}`,
      請求金額: 1000,
      支払完了日: '2026-07-10',
      取引先: 'x',
    }));
    const c = findMatchCandidates({ 日付: '2026-07-10', 出金額: 1000 }, many, []);
    expect(c).toHaveLength(3);
  });
});

describe('describeCandidates', () => {
  it('人間向けの確認メモを組み立てる', () => {
    const note = describeCandidates([
      { manageId: 'INV-1', source: '請求書', dateDiff: 0, counterparty: '広告社' },
    ]);
    expect(note).toContain('INV-1');
    expect(note).toContain('広告社');
    expect(note).toContain('突合済み');
  });

  it('候補ゼロなら空文字', () => {
    expect(describeCandidates([])).toBe('');
  });
});
