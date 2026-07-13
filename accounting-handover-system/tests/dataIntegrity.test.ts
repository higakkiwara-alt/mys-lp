/**
 * 不整合一覧の重複防止・通知の重複防止・リマインド生成のテスト
 */
import { describe, expect, it } from 'vitest';
import { issueKey } from '../src/services/validationService';
import { buildNotificationBody, dedupKeyFor } from '../src/services/notificationService';
import {
  buildMonthlyCloseOverdue,
  buildQuestionReminders,
  buildStatusReminders,
  buildUrgentItems,
} from '../src/jobs/reminderNotification';

const TODAY = new Date(2026, 6, 13);

describe('不整合一覧の重複防止キー', () => {
  it('同じ不整合は同じキーになる(2回目の実行で重複登録されない根拠)', () => {
    const a = issueKey({ type: '期限超過', sheetName: '02_書類受付台帳', manageId: 'ACC-1' });
    const b = issueKey({ type: '期限超過', sheetName: '02_書類受付台帳', manageId: 'ACC-1' });
    expect(a).toBe(b);
  });

  it('種別・シート・IDのいずれかが違えば別キーになる', () => {
    const base = { type: 't', sheetName: 's', manageId: 'm' };
    expect(issueKey(base)).not.toBe(issueKey({ ...base, type: 't2' }));
    expect(issueKey(base)).not.toBe(issueKey({ ...base, sheetName: 's2' }));
    expect(issueKey(base)).not.toBe(issueKey({ ...base, manageId: 'm2' }));
  });
});

describe('通知', () => {
  const items = [
    { manageId: 'ACC-1', content: 'テスト書類', deadline: '2026-07-15', assignee: '担当A' },
  ];

  it('本文に件数・管理ID・内容・期限・担当者・URLを含む', () => {
    const body = buildNotificationBody('期限超過', items, 'https://example.com/sheet');
    expect(body).toContain('対象件数: 1 件');
    expect(body).toContain('ACC-1');
    expect(body).toContain('テスト書類');
    expect(body).toContain('2026-07-15');
    expect(body).toContain('担当A');
    expect(body).toContain('https://example.com/sheet');
  });

  it('同じタイトル・同じ対象なら重複キーが一致する(短時間の重複通知防止の根拠)', () => {
    expect(dedupKeyFor('期限超過', items)).toBe(dedupKeyFor('期限超過', [...items]));
    expect(dedupKeyFor('期限超過', items)).not.toBe(
      dedupKeyFor('期限超過', [{ ...items[0], manageId: 'ACC-2' }]),
    );
  });

  it('51件以上は省略表示になる', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      manageId: `ID-${i}`,
      content: 'x',
      deadline: '',
      assignee: '',
    }));
    const body = buildNotificationBody('多件数', many, 'url');
    expect(body).toContain('ほか 10 件');
  });
});

describe('リマインド生成', () => {
  it('ステータス別リマインドを生成する', () => {
    const intake = [
      {
        管理ID: 'A1',
        現在のステータス: '代表確認待ち',
        '書類名・内容': '見積書',
        対応期限: '',
        処理担当者: '担当A',
      },
      {
        管理ID: 'A2',
        現在のステータス: '未処理',
        '書類名・内容': 'x',
        対応期限: '',
        処理担当者: '',
      },
    ];
    const items = buildStatusReminders(intake, '代表確認待ち');
    expect(items).toHaveLength(1);
    expect(items[0].manageId).toBe('A1');
  });

  it('緊急案件は未完了のみ対象', () => {
    const intake = [
      { 管理ID: 'A1', 重要度: '緊急', 現在のステータス: '未処理', '書類名・内容': 'x' },
      { 管理ID: 'A2', 重要度: '緊急', 現在のステータス: '処理済み', '書類名・内容': 'x' },
    ];
    expect(buildUrgentItems(intake)).toHaveLength(1);
  });

  it('月次締めの期限超過を抽出する', () => {
    const rows = [
      {
        チェックID: 'M1',
        実施状況: '未実施',
        期限: '2026-07-10',
        対象年月: '2026-06',
        チェック項目: 'x',
        対象店舗: '店舗A',
        担当者: '',
      },
      {
        チェックID: 'M2',
        実施状況: '完了',
        期限: '2026-07-10',
        対象年月: '2026-06',
        チェック項目: 'x',
        対象店舗: '店舗A',
        担当者: '',
      },
      {
        チェックID: 'M3',
        実施状況: '未実施',
        期限: '2026-07-20',
        対象年月: '2026-06',
        チェック項目: 'x',
        対象店舗: '店舗A',
        担当者: '',
      },
    ];
    const items = buildMonthlyCloseOverdue(rows, TODAY);
    expect(items.map((i) => i.manageId)).toEqual(['M1']);
  });

  it('回答期限が近い未回答の質問を抽出する', () => {
    const rows = [
      {
        質問ID: 'Q1',
        回答内容: '',
        ステータス: '未処理',
        回答期限: '2026-07-15',
        質問内容: 'a',
        確認先: '税理士',
      },
      {
        質問ID: 'Q2',
        回答内容: '済',
        ステータス: '処理済み',
        回答期限: '2026-07-15',
        質問内容: 'b',
        確認先: '税理士',
      },
      {
        質問ID: 'Q3',
        回答内容: '',
        ステータス: '未処理',
        回答期限: '2026-08-15',
        質問内容: 'c',
        確認先: '税理士',
      },
    ];
    const items = buildQuestionReminders(rows, TODAY, 3);
    expect(items.map((i) => i.manageId)).toEqual(['Q1']);
  });
});
