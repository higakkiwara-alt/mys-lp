import { describe, expect, it } from 'vitest';
import {
  buildDedupKey,
  buildFileName,
  colToLetter,
  daysBetween,
  formatDate,
  isBlank,
  nextMonth,
  parseYearMonth,
  sanitizeFileNamePart,
  toDate,
} from '../src/utils/helpers';

describe('helpers', () => {
  it('formatDate はローカル日付を yyyy-MM-dd 形式にする', () => {
    expect(formatDate(new Date(2026, 6, 13))).toBe('2026-07-13');
  });

  it('parseYearMonth は複数形式を受け付ける', () => {
    expect(parseYearMonth('2026-07')).toEqual({ year: 2026, month: 7 });
    expect(parseYearMonth('202607')).toEqual({ year: 2026, month: 7 });
    expect(parseYearMonth('2026-13')).toBeNull();
    expect(parseYearMonth('abc')).toBeNull();
  });

  it('nextMonth は年をまたぐ', () => {
    expect(nextMonth(2026, 12)).toEqual({ year: 2027, month: 1 });
    expect(nextMonth(2026, 7)).toEqual({ year: 2026, month: 8 });
  });

  it('colToLetter は26進の列文字を返す', () => {
    expect(colToLetter(1)).toBe('A');
    expect(colToLetter(26)).toBe('Z');
    expect(colToLetter(27)).toBe('AA');
    expect(colToLetter(42)).toBe('AP');
  });

  it('toDate は文字列・Dateを解釈し、不正値は null', () => {
    expect(toDate('2026-07-13')?.getMonth()).toBe(6);
    expect(toDate('2026/7/1')?.getDate()).toBe(1);
    expect(toDate(new Date(2026, 0, 1))).not.toBeNull();
    expect(toDate('明日')).toBeNull();
    expect(toDate('')).toBeNull();
  });

  it('daysBetween は日単位の差を返す', () => {
    expect(daysBetween(new Date(2026, 6, 10), new Date(2026, 6, 13))).toBe(3);
    expect(daysBetween(new Date(2026, 6, 13), new Date(2026, 6, 10))).toBe(-3);
  });

  it('isBlank は空欄を判定する', () => {
    expect(isBlank('')).toBe(true);
    expect(isBlank('  ')).toBe(true);
    expect(isBlank(null)).toBe(true);
    expect(isBlank(0)).toBe(false);
    expect(isBlank('a')).toBe(false);
  });

  it('buildDedupKey は 利用日+購入先+金額+利用者 を結合する', () => {
    const key = buildDedupKey(new Date(2026, 6, 13), 'サンプル商店', '1,280', '担当A');
    expect(key).toBe('2026-07-13|サンプル商店|1280|担当A');
  });

  it('同じ内容なら文字列日付でも同じキーになる', () => {
    const a = buildDedupKey('2026-07-13', '店', 1280, '担当A');
    const b = buildDedupKey(new Date(2026, 6, 13), '店', '1280', '担当A');
    expect(a).toBe(b);
  });

  it('sanitizeFileNamePart は禁止文字を除去し空白を _ に変換する', () => {
    expect(sanitizeFileNamePart('株式会社/テスト:商事 <本店>')).toBe('株式会社テスト商事_本店');
    expect(sanitizeFileNamePart('  a  b  ')).toBe('a_b');
  });

  it('buildFileName は仕様の形式で提案ファイル名を作る', () => {
    const name = buildFileName({
      date: '2026-07-10',
      entity: 'OTK COMPANY',
      vendor: '〇〇商事',
      docType: '請求書',
      amount: '55,000',
      manageId: 'ACC-202607-0001',
      extension: 'pdf',
    });
    expect(name).toBe('20260710_OTK_COMPANY_〇〇商事_請求書_55000_ACC-202607-0001.pdf');
  });

  it('buildFileName は長すぎる名前を制限する', () => {
    const name = buildFileName({
      date: '2026-07-10',
      entity: 'あ'.repeat(200),
      vendor: 'b',
      docType: 'c',
      amount: 1,
      manageId: 'X-1',
      extension: 'pdf',
    });
    expect(name.length).toBeLessThanOrEqual(124); // 120 + '.pdf'
  });
});
