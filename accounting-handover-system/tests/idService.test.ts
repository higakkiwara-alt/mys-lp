import { describe, expect, it } from 'vitest';
import { formatId, nextSequence } from '../src/services/idService';

describe('idService', () => {
  it('既存IDが無ければ 1 から採番する', () => {
    expect(nextSequence([], 'ACC', '202607')).toBe(1);
  });

  it('同一月の最大値+1を採番する', () => {
    const ids = ['ACC-202607-0001', 'ACC-202607-0005', 'ACC-202606-0009'];
    expect(nextSequence(ids, 'ACC', '202607')).toBe(6);
  });

  it('別の月のIDは無視する(月が変わると連番はリセット)', () => {
    const ids = ['ACC-202606-0009'];
    expect(nextSequence(ids, 'ACC', '202607')).toBe(1);
  });

  it('別プレフィックスのIDは無視する', () => {
    const ids = ['RCT-202607-0003', 'ACC-202607-0002'];
    expect(nextSequence(ids, 'ACC', '202607')).toBe(3);
  });

  it('通し番号形式(FIX-0001)も採番できる', () => {
    expect(nextSequence(['FIX-0001', 'FIX-0010'], 'FIX', '')).toBe(11);
  });

  it('不正な形式・空文字は無視する', () => {
    const ids = ['', 'ACC-202607-abc', 'ACC202607-0004', 'ACC-202607-0002'];
    expect(nextSequence(ids, 'ACC', '202607')).toBe(3);
  });

  it('4桁を超える連番も扱える', () => {
    expect(nextSequence(['ACC-202607-12000'], 'ACC', '202607')).toBe(12001);
  });

  it('formatId は仕様どおりの形式を返す', () => {
    expect(formatId('ACC', '202607', 1)).toBe('ACC-202607-0001');
    expect(formatId('FIX', '', 12)).toBe('FIX-0012');
    expect(formatId('LOG', '20260713', 3)).toBe('LOG-20260713-0003');
  });
});
