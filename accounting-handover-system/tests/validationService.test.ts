import { describe, expect, it } from 'vitest';
import {
  detectIssues,
  findDuplicateReceipts,
  issueKey,
  type IntegrityInput,
} from '../src/services/validationService';

const TODAY = new Date(2026, 6, 13); // 2026-07-13

function baseInput(overrides: Partial<IntegrityInput> = {}): IntegrityInput {
  return {
    intake: [],
    receipts: [],
    invoices: [],
    contracts: [],
    questions: [],
    monthlyClose: [],
    storeNames: ['店舗A', '店舗B'],
    staffNames: ['担当A', '担当B'],
    today: TODAY,
    warnDays: 3,
    contractWarnDays: 30,
    ...overrides,
  };
}

describe('detectIssues', () => {
  it('データが無ければ不整合ゼロ', () => {
    expect(detectIssues(baseInput())).toEqual([]);
  });

  it('処理済みなのに完了日がない・原本リンクがない を検出する', () => {
    const issues = detectIssues(
      baseInput({
        intake: [
          {
            管理ID: 'ACC-202607-0001',
            現在のステータス: '処理済み',
            完了日: '',
            'Google Driveリンク': '',
            原本保管場所: '',
            対象店舗: '店舗A',
          },
        ],
      }),
    );
    const types = issues.map((i) => i.type);
    expect(types).toContain('処理済みなのに完了日がない');
    expect(types).toContain('処理済みなのに原本リンクがない');
  });

  it('期限超過(対応期限)を検出し、未来の期限は検出しない', () => {
    const issues = detectIssues(
      baseInput({
        intake: [
          {
            管理ID: 'A1',
            現在のステータス: '未処理',
            対応期限: '2026-07-10',
            金額: 100,
            対象店舗: '店舗A',
            書類種別: '請求書',
          },
          {
            管理ID: 'A2',
            現在のステータス: '未処理',
            対応期限: '2026-07-20',
            金額: 100,
            対象店舗: '店舗A',
            書類種別: '請求書',
          },
        ],
      }),
    );
    const overdue = issues.filter((i) => i.type === '期限超過');
    expect(overdue).toHaveLength(1);
    expect(overdue[0].manageId).toBe('A1');
  });

  it('金額・店舗・書類種別の未入力を検出する', () => {
    const issues = detectIssues(
      baseInput({
        intake: [
          { 管理ID: 'A1', 現在のステータス: '未処理', 金額: '', 対象店舗: '', 書類種別: '' },
        ],
      }),
    );
    const types = issues.map((i) => i.type);
    expect(types).toContain('金額が未入力');
    expect(types).toContain('店舗が未入力');
    expect(types).toContain('書類種別が未入力');
  });

  it('管理IDの重複を検出する', () => {
    const issues = detectIssues(
      baseInput({
        intake: [
          {
            管理ID: 'DUP-1',
            現在のステータス: '処理済み',
            完了日: '2026-07-01',
            'Google Driveリンク': 'x',
            対象店舗: '店舗A',
          },
          {
            管理ID: 'DUP-1',
            現在のステータス: '処理済み',
            完了日: '2026-07-01',
            'Google Driveリンク': 'x',
            対象店舗: '店舗A',
          },
        ],
      }),
    );
    expect(issues.filter((i) => i.type === '管理ID重複')).toHaveLength(1);
  });

  it('支払済みなのに支払完了日・支払証明リンクがない を検出する', () => {
    const issues = detectIssues(
      baseInput({
        invoices: [
          {
            管理ID: 'INV-1',
            支払状況: '支払済み',
            支払完了日: '',
            支払証明リンク: '',
            対象店舗: '店舗A',
          },
        ],
      }),
    );
    const types = issues.map((i) => i.type);
    expect(types).toContain('支払済みなのに支払完了日がない');
    expect(types).toContain('支払済みなのに支払証明リンクがない');
  });

  it('支払期限3日前以内の未払い請求を検出する', () => {
    const issues = detectIssues(
      baseInput({
        invoices: [
          {
            管理ID: 'INV-2',
            支払状況: '未払い',
            支払期限: '2026-07-15',
            請求金額: 100,
            対象店舗: '店舗A',
          },
          {
            管理ID: 'INV-3',
            支払状況: '未払い',
            支払期限: '2026-07-30',
            請求金額: 100,
            対象店舗: '店舗A',
          },
        ],
      }),
    );
    const near = issues.filter((i) => i.type === '支払期限接近');
    expect(near).toHaveLength(1);
    expect(near[0].manageId).toBe('INV-2');
  });

  it('支払期限超過の未払い請求は期限超過として検出する', () => {
    const issues = detectIssues(
      baseInput({
        invoices: [
          {
            管理ID: 'INV-4',
            支払状況: '未払い',
            支払期限: '2026-07-01',
            請求金額: 100,
            対象店舗: '店舗A',
          },
        ],
      }),
    );
    expect(issues.some((i) => i.type === '期限超過' && i.manageId === 'INV-4')).toBe(true);
  });

  it('原本未保存・会計ソフト入力待ちを検出する', () => {
    const issues = detectIssues(
      baseInput({
        receipts: [
          {
            管理ID: 'RCT-1',
            ステータス: '処理済み',
            原本保存状況: '未保存',
            会計ソフト入力状況: '未入力',
            金額: 100,
            対象店舗: '店舗A',
          },
        ],
      }),
    );
    const types = issues.map((i) => i.type);
    expect(types).toContain('原本未保存');
    expect(types).toContain('会計ソフト入力待ち');
  });

  it('税理士確認必要なのにステータスが違う場合を検出する', () => {
    const issues = detectIssues(
      baseInput({
        intake: [
          {
            管理ID: 'A9',
            現在のステータス: '未処理',
            税理士確認必要: true,
            金額: 1,
            対象店舗: '店舗A',
            書類種別: '請求書',
          },
        ],
      }),
    );
    expect(issues.some((i) => i.type === '税理士確認必要なのに確認ステータスがない')).toBe(true);
  });

  it('質問回答済みなのにルール未反映を検出する', () => {
    const issues = detectIssues(
      baseInput({
        questions: [
          {
            質問ID: 'QST-1',
            回答内容: '経費でよい',
            ルール化の要否: '要',
            書類処理ルールへの反映状況: '未反映',
            ステータス: '処理済み',
          },
        ],
      }),
    );
    expect(issues.some((i) => i.type === '質問回答済みなのにルール未反映')).toBe(true);
  });

  it('マスターに存在しない店舗名・担当者名を検出する', () => {
    const issues = detectIssues(
      baseInput({
        intake: [
          {
            管理ID: 'A5',
            現在のステータス: '処理済み',
            完了日: 'x',
            'Google Driveリンク': 'x',
            対象店舗: '存在しない店',
            処理担当者: '知らない人',
          },
        ],
      }),
    );
    const types = issues.map((i) => i.type);
    expect(types).toContain('マスターに存在しない店舗名');
    expect(types).toContain('マスターに存在しない担当者名');
  });

  it('「全社」はマスターに無くても店舗名エラーにしない', () => {
    const issues = detectIssues(
      baseInput({
        invoices: [{ 管理ID: 'INV-9', 支払状況: '対象外', 対象店舗: '全社' }],
      }),
    );
    expect(issues.some((i) => i.type === 'マスターに存在しない店舗名')).toBe(false);
  });

  it('契約の解約通知期限接近を検出する', () => {
    const issues = detectIssues(
      baseInput({
        contracts: [
          {
            管理ID: 'CTR-1',
            '契約・書類名': 'テスト契約',
            解約通知期限: '2026-08-01',
            ステータス: '未処理',
            対象店舗: '店舗A',
          },
        ],
      }),
    );
    expect(issues.some((i) => i.type === '契約更新・解約期限接近')).toBe(true);
  });
});

describe('issueKey / findDuplicateReceipts', () => {
  it('issueKey は種別+シート+管理IDで一意', () => {
    expect(issueKey({ type: 'a', sheetName: 'b', manageId: 'c' })).toBe('a|b|c');
  });

  it('findDuplicateReceipts は2件以上あるキーだけ返す', () => {
    const dup = findDuplicateReceipts([
      { rowNumber: 2, key: 'k1' },
      { rowNumber: 3, key: 'k1' },
      { rowNumber: 4, key: 'k2' },
      { rowNumber: 5, key: '' },
      { rowNumber: 6, key: '||||' },
    ]);
    expect(dup.size).toBe(1);
    expect(dup.get('k1')).toEqual([2, 3]);
  });
});
