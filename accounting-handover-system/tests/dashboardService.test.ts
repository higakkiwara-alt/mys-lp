import { describe, expect, it } from 'vitest';
import { countOpen, openStatusRegex } from '../src/services/dashboardService';
import { OPEN_STATUSES } from '../src/constants';

describe('dashboardService', () => {
  it('countOpen は未完了ステータスのみ数える(ダッシュボード数式と同じ定義)', () => {
    const records = [
      { 現在のステータス: '未処理' },
      { 現在のステータス: '税理士確認待ち' },
      { 現在のステータス: '処理済み' },
      { 現在のステータス: '対応不要' },
      { 現在のステータス: '' },
    ];
    expect(countOpen(records, '現在のステータス')).toBe(2);
  });

  it('openStatusRegex は全未完了ステータスを含む', () => {
    const regex = new RegExp(`^(${openStatusRegex()})$`);
    for (const status of OPEN_STATUSES) {
      expect(regex.test(status)).toBe(true);
    }
    expect(regex.test('処理済み')).toBe(false);
    expect(regex.test('対応不要')).toBe(false);
  });
});
