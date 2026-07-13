/**
 * Phase 2 外部連携の純関数テスト
 * (CSV解析・OCRテキスト解析・Square集計・分類提案・仕訳候補・Webhook・店舗別損益)
 */
import { describe, expect, it } from 'vitest';
import { parseCsv, parseStatementCsv, statementKey, toCsv } from '../src/utils/csv';
import { parseReceiptText, isOcrTarget } from '../src/services/ocrService';
import { aggregateSquarePayments } from '../src/services/squareService';
import { suggestClassification } from '../src/services/driveClassifyService';
import { buildJournalRows, JOURNAL_HEADERS } from '../src/services/accountingExportService';
import { buildWebhookPayload } from '../src/services/webhookService';
import { buildIntakeTitleFromMail } from '../src/services/gmailService';
import { guessStatementSource } from '../src/services/statementImportService';
import { aggregateStorePL } from '../src/jobs/monthlyReport';

describe('CSVユーティリティ', () => {
  it('parseCsv はクォート・カンマ内包・CRLFを扱える', () => {
    const rows = parseCsv('a,"b,1","c""x"\r\n1,2,3\n');
    expect(rows).toEqual([
      ['a', 'b,1', 'c"x'],
      ['1', '2', '3'],
    ]);
  });

  it('toCsv は必要なフィールドだけをクォートする', () => {
    expect(toCsv([['a', 'b,c', 'd"e']])).toBe('a,"b,c","d""e"');
  });

  it('parseStatementCsv は銀行明細(日付/摘要/入出金/残高)を解析する', () => {
    const csv = [
      '日付,摘要,お引出額,お預入額,残高',
      '2026/07/01,振込 サンプル商事,55000,,945000',
      '2026/07/05,入金,,100000,1045000',
    ].join('\n');
    const rows = parseStatementCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      date: '2026-07-01',
      description: '振込 サンプル商事',
      deposit: '',
      withdrawal: 55000,
      balance: 945000,
    });
    expect(rows[1].deposit).toBe(100000);
  });

  it('parseStatementCsv はカード明細(ご利用日/ご利用金額)も解析し、前置き行を無視する', () => {
    const csv = [
      'カードご利用明細',
      '',
      'ご利用日,ご利用店名,ご利用金額',
      '2026-07-02,サンプル美容材料,12800',
      '合計,,12800',
    ].join('\n');
    const rows = parseStatementCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].withdrawal).toBe(12800);
    expect(rows[0].date).toBe('2026-07-02');
  });

  it('parseStatementCsv は非対応フォーマットで空配列を返す(エラーにしない)', () => {
    expect(parseStatementCsv('こんにちは\nただのテキスト')).toEqual([]);
  });

  it('statementKey は同一内容で同一キー、内容が違えば別キー', () => {
    const row = {
      date: '2026-07-01',
      description: 'x',
      deposit: '' as const,
      withdrawal: 100,
      balance: '' as const,
    };
    expect(statementKey('口座A', row)).toBe(statementKey('口座A', { ...row }));
    expect(statementKey('口座A', row)).not.toBe(statementKey('口座B', row));
    expect(statementKey('口座A', row)).not.toBe(statementKey('口座A', { ...row, withdrawal: 200 }));
  });
});

describe('レシートOCR解析', () => {
  it('日付・合計金額・購入先を推定する', () => {
    const text = [
      'サンプルドラッグ 立川店',
      '2026年7月10日 14:22',
      'シャンプー ¥1,200',
      'カラー剤 ¥8,800',
      '合計 ¥10,000',
      'お預り ¥10,000',
    ].join('\n');
    const guess = parseReceiptText(text);
    expect(guess.date).toBe('2026-07-10');
    expect(guess.amount).toBe(10000);
    expect(guess.vendor).toBe('サンプルドラッグ 立川店');
    expect(guess.excerpt).toContain('合計');
  });

  it('合計行が無ければ最大金額を採用する', () => {
    const guess = parseReceiptText('店名\n2026/07/01\n品A 500円\n品B 1,500円');
    expect(guess.amount).toBe(1500);
  });

  it('不正な日付や範囲外の金額は無視する', () => {
    const guess = parseReceiptText('9999年99月99日\n5円');
    expect(guess.date).toBe('');
    expect(guess.amount).toBe('');
  });

  it('isOcrTarget は画像のみ対象(PDFは対象外=制限事項)', () => {
    expect(isOcrTarget('image/jpeg')).toBe(true);
    expect(isOcrTarget('application/pdf')).toBe(false);
  });
});

describe('Square売上集計', () => {
  it('日付×ロケーションで金額・手数料・件数を集計する', () => {
    const daily = aggregateSquarePayments([
      { createdAt: '2026-07-01T10:00:00Z', locationId: 'L1', amount: 5000, fee: 150 },
      { createdAt: '2026-07-01T12:00:00Z', locationId: 'L1', amount: 3000, fee: 90 },
      { createdAt: '2026-07-01T13:00:00Z', locationId: 'L2', amount: 8000, fee: 240 },
      { createdAt: '2026-07-02T09:00:00Z', locationId: 'L1', amount: 1000, fee: 30 },
    ]);
    expect(daily).toHaveLength(3);
    const l1d1 = daily.find((d) => d.date === '2026-07-01' && d.locationId === 'L1')!;
    expect(l1d1).toMatchObject({ amount: 8000, fee: 240, count: 2 });
  });
});

describe('ファイル分類提案', () => {
  it('キーワードから書類種別とフォルダを推定する', () => {
    expect(suggestClassification('20260710_請求書_広告.pdf', '')).toMatchObject({
      docType: '請求書',
      folder: '02_請求書',
    });
    expect(suggestClassification('IMG_1234.jpg', '領収書 合計 ¥1,000')).toMatchObject({
      docType: '領収書',
    });
    expect(suggestClassification('謎のファイル.png', '')).toMatchObject({
      docType: 'その他',
      folder: '00_未分類・新規受付',
    });
  });
});

describe('仕訳候補CSV', () => {
  it('対象年月のレシート・請求書だけを日付順に出力する', () => {
    const rows = buildJournalRows(
      [
        {
          管理ID: 'RCT-1',
          利用日: '2026-07-10',
          金額: 1000,
          購入先: '店X',
          内容: '材料',
          対象店舗: '店舗A',
          支払方法: '現金',
        },
        { 管理ID: 'RCT-2', 利用日: '2026-06-10', 金額: 500, 購入先: '店Y' },
        { 管理ID: 'RCT-3', 利用日: '2026-07-01', 金額: '', 購入先: '金額なし' },
      ],
      [
        {
          管理ID: 'INV-1',
          支払完了日: '2026-07-05',
          請求金額: 55000,
          取引先: '広告社',
          請求内容: '広告費',
        },
      ],
      '2026-07',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0][0]).toBe('2026-07-05'); // 日付昇順
    expect(rows[1][9]).toBe('RCT-1');
    expect(JOURNAL_HEADERS).toContain('勘定科目候補');
  });
});

describe('Webhookペイロード', () => {
  it('必要項目を含み、内容は200文字に制限される', () => {
    const payload = buildWebhookPayload(
      '期限超過',
      [{ manageId: 'A1', content: 'あ'.repeat(300), deadline: '2026-07-15', assignee: '担当' }],
      'test',
      '2026-07-13 08:00:00',
    ) as any;
    expect(payload.source).toBe('otk-accounting-handover-system');
    expect(payload.count).toBe(1);
    expect(payload.items[0].content.length).toBe(200);
  });
});

describe('Gmail・明細の補助関数', () => {
  it('メール件名から台帳タイトルを組み立てる', () => {
    const title = buildIntakeTitleFromMail(
      '7月分ご請求書',
      '株式会社サンプル <billing@example.com>',
    );
    expect(title).toContain('7月分ご請求書');
    expect(title).toContain('株式会社サンプル');
    expect(title).not.toContain('billing@example.com');
  });

  it('ファイル名から明細の種別を推定する', () => {
    expect(guessStatementSource('サンプルカードVISA_202607.csv').kind).toBe('クレジットカード');
    expect(guessStatementSource('サンプル銀行_普通_202607.csv').kind).toBe('銀行');
  });
});

describe('店舗別月次集計', () => {
  it('売上・経費・粗利を店舗ごとに集計する', () => {
    const pl = aggregateStorePL(
      '2026-07',
      [
        { 日付: '2026-07-01', 店舗: '店舗A', 売上金額: 100000, 取引件数: 10 },
        { 日付: '2026-07-02', 店舗: '店舗A', 売上金額: 50000, 取引件数: 5 },
        { 日付: '2026-06-30', 店舗: '店舗A', 売上金額: 99999, 取引件数: 9 }, // 対象外の月
      ],
      [{ 利用日: '2026-07-10', 対象店舗: '店舗A', 金額: 20000 }],
      [{ 支払完了日: '2026-07-15', 対象店舗: '店舗A', 請求金額: 30000 }],
    );
    expect(pl).toHaveLength(1);
    expect(pl[0]).toMatchObject({
      store: '店舗A',
      sales: 150000,
      receiptCost: 20000,
      invoiceCost: 30000,
      profit: 100000,
      salesCount: 15,
      costCount: 2,
    });
  });

  it('店舗未入力は「全社」に集計される', () => {
    const pl = aggregateStorePL(
      '2026-07',
      [],
      [{ 利用日: '2026-07-01', 対象店舗: '', 金額: 1000 }],
      [],
    );
    expect(pl[0].store).toBe('全社');
  });
});
