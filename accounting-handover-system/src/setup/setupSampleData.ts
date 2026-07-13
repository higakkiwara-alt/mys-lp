/**
 * 初期データ・サンプルデータの投入(冪等)
 * - 書類処理ルール(初期案): カテゴリ単位で重複登録しない
 * - マスターの仮データ / 各主要シートのサンプル行: 備考に SAMPLE_MARK を付け、
 *   deleteSampleData() で削除できる
 * 実在の個人情報・会社情報は使用しない。
 */
import { RULE_DEFAULTS, RULE_SEEDS, SAMPLE_MARK, COMPANY_WIDE } from '../constants';
import type { SheetKey } from '../types';
import { formatDate, formatDateTime } from '../utils/helpers';
import { logger } from '../utils/logger';
import { formatId, nextSequence } from '../services/idService';
import { seedSettings } from '../services/masterDataService';
import {
  appendRecord,
  ensureSheet,
  findSheet,
  headerMap,
  readRecords,
} from '../services/sheetService';

/** 書類処理ルールの初期データを投入(カテゴリで重複判定) */
export function seedRules(): number {
  ensureSheet('RULE');
  const existing = new Set(
    readRecords('RULE').map((r) => String(r.record['書類カテゴリ'] ?? '').trim()),
  );
  const ids = readRecords('RULE').map((r) => String(r.record['ルールID'] ?? ''));
  let seq = nextSequence(ids, 'RUL', '');
  const today = formatDate(new Date());
  let added = 0;
  for (const seed of RULE_SEEDS) {
    if (existing.has(seed.category)) continue;
    appendRecord('RULE', {
      ルールID: formatId('RUL', '', seq++),
      書類カテゴリ: seed.category,
      書類の具体例: seed.examples,
      受け取った直後にすること: seed.firstAction ?? RULE_DEFAULTS.whenUnsure,
      スプレッドシート登録先: seed.registerTo ?? RULE_DEFAULTS.registerTo,
      必須入力項目: seed.requiredFields ?? RULE_DEFAULTS.requiredFields,
      原本の保存方法: seed.originalStorage ?? RULE_DEFAULTS.originalStorage,
      Drive保存フォルダ: seed.driveFolder ?? '00_未分類・新規受付',
      ファイル名ルール: RULE_DEFAULTS.fileNameRule,
      誰に報告するか: seed.reportTo ?? RULE_DEFAULTS.reportTo,
      誰の承認が必要か: seed.approver ?? RULE_DEFAULTS.approver,
      税理士への共有有無: seed.shareTax ?? RULE_DEFAULTS.shareTax,
      社労士への共有有無: seed.shareLabor ?? RULE_DEFAULTS.shareLabor,
      会計ソフト入力有無: seed.accounting ?? RULE_DEFAULTS.accounting,
      処理期限: seed.deadline ?? RULE_DEFAULTS.deadline,
      処理完了の条件: seed.doneCondition ?? RULE_DEFAULTS.doneCondition,
      判断できない場合の対応: seed.whenUnsure ?? RULE_DEFAULTS.whenUnsure,
      税理士確認必要: !!seed.taxCheck,
      注意点: [seed.taxCheck, seed.caution, '初期案です。自社運用に合わせて更新してください。']
        .filter(Boolean)
        .join(' / '),
      最終更新日: today,
      更新者: 'システム初期設定',
      '有効・無効': '有効',
    });
    added++;
  }
  if (added > 0) logger.info('seedRules', `書類処理ルールを ${added} 件登録しました(初期案)`);
  return added;
}

/** シートにデータ行があるか */
function hasData(key: SheetKey): boolean {
  const sheet = findSheet(key);
  return !!sheet && sheet.getLastRow() >= 2;
}

/** マスターの仮データとサンプル行を投入する(既にデータがあるシートには入れない) */
export function seedSampleData(): void {
  seedSettings();
  seedRules();
  const nowStr = formatDateTime(new Date());
  const today = formatDate(new Date());
  const ymd = new Date();
  const ym = `${ymd.getFullYear()}-${String(ymd.getMonth() + 1).padStart(2, '0')}`;
  const ymCompact = ym.replace('-', '');

  if (!hasData('BUSINESS')) {
    appendRecord('BUSINESS', {
      事業ID: 'BUS-0001',
      '法人・個人事業区分': '法人',
      '法人・事業名': 'OTK COMPANY(仮・要変更)',
      店舗名: '店舗A(仮・要変更)',
      店舗コード: 'A01',
      管理責任者: '店舗責任者(仮)',
      稼働状況: '稼働中',
      備考: `${SAMPLE_MARK}実際の店舗情報へ書き換えてください(README参照)`,
    });
    appendRecord('BUSINESS', {
      事業ID: 'BUS-0002',
      '法人・個人事業区分': '法人',
      '法人・事業名': 'OTK COMPANY(仮・要変更)',
      店舗名: '店舗B(仮・要変更)',
      店舗コード: 'B01',
      管理責任者: '店舗責任者(仮)',
      稼働状況: '稼働中',
      備考: `${SAMPLE_MARK}実際の店舗情報へ書き換えてください`,
    });
  }

  if (!hasData('STAFF')) {
    appendRecord('STAFF', {
      担当者ID: 'USR-0001',
      氏名: '代表(仮)',
      役割: '代表',
      承認権限: true,
      通知対象: true,
      稼働状況: '稼働中',
      備考: `${SAMPLE_MARK}実際の担当者へ書き換えてください`,
    });
    appendRecord('STAFF', {
      担当者ID: 'USR-0002',
      氏名: '経理担当(仮)',
      役割: '経理担当者',
      承認権限: false,
      通知対象: true,
      稼働状況: '稼働中',
      備考: `${SAMPLE_MARK}実際の担当者へ書き換えてください`,
    });
    appendRecord('STAFF', {
      担当者ID: 'USR-0003',
      氏名: '店舗責任者(仮)',
      役割: '店舗責任者',
      所属店舗: '店舗A(仮・要変更)',
      承認権限: false,
      通知対象: false,
      稼働状況: '稼働中',
      備考: `${SAMPLE_MARK}実際の担当者へ書き換えてください`,
    });
  }

  if (!hasData('VENDOR')) {
    appendRecord('VENDOR', {
      取引先ID: 'VND-0001',
      取引先名: 'サンプル美容材料株式会社',
      取引内容: 'カラー剤・パーマ剤の仕入(架空)',
      通常の支払方法: '銀行振込',
      通常の勘定科目候補: '仕入高(候補・税理士確認必要)',
      '有効・無効': '有効',
      備考: `${SAMPLE_MARK}架空の取引先です`,
    });
    appendRecord('VENDOR', {
      取引先ID: 'VND-0002',
      取引先名: 'サンプル広告代理店',
      取引内容: 'Web広告運用(架空)',
      通常の支払方法: '銀行振込',
      通常の勘定科目候補: '広告宣伝費(候補・税理士確認必要)',
      '有効・無効': '有効',
      備考: `${SAMPLE_MARK}架空の取引先です`,
    });
  }

  if (!hasData('INTAKE')) {
    appendRecord('INTAKE', {
      管理ID: `ACC-${ymCompact}-0001`,
      受付日: today,
      対象年月: ym,
      '法人・事業区分': '法人',
      対象店舗: '店舗A(仮・要変更)',
      書類種別: '請求書',
      '書類名・内容': '架空の広告費請求書(サンプル)',
      '発行元・取引先': 'サンプル広告代理店',
      金額: 55000,
      支払方法: '銀行振込',
      勘定科目候補: '広告宣伝費(候補)',
      税理士確認必要: false,
      現在のステータス: '未処理',
      重要度: '中',
      備考: `${SAMPLE_MARK}動作確認用のサンプルです`,
      登録日時: nowStr,
    });
    appendRecord('INTAKE', {
      管理ID: `ACC-${ymCompact}-0002`,
      受付日: today,
      対象年月: ym,
      '法人・事業区分': '判断不明',
      対象店舗: '店舗B(仮・要変更)',
      書類種別: '行政書類',
      '書類名・内容': '架空の行政からのお知らせ(サンプル)',
      '発行元・取引先': '(架空)行政機関',
      現在のステータス: '内容確認中',
      確認先: '税理士',
      重要度: '高',
      備考: `${SAMPLE_MARK}動作確認用のサンプルです`,
      登録日時: nowStr,
    });
  }

  if (!hasData('RECEIPT')) {
    appendRecord('RECEIPT', {
      管理ID: `RCT-${ymCompact}-0001`,
      利用日: today,
      登録日: today,
      '法人・事業区分': '法人',
      対象店舗: '店舗A(仮・要変更)',
      利用者: '店舗責任者(仮)',
      購入先: 'サンプル美容材料株式会社',
      内容: 'カラー剤の購入(架空)',
      利用目的: '施術用材料の補充',
      金額: 12800,
      支払方法: '現金',
      勘定科目候補: '仕入高(候補)',
      原本保存状況: '未保存',
      会計ソフト入力状況: '未入力',
      ステータス: '未処理',
      備考: `${SAMPLE_MARK}動作確認用のサンプルです`,
      登録日時: nowStr,
    });
  }

  if (!hasData('INVOICE')) {
    appendRecord('INVOICE', {
      管理ID: `INV-${ymCompact}-0001`,
      請求書受領日: today,
      支払期限: formatDate(new Date(ymd.getFullYear(), ymd.getMonth(), ymd.getDate() + 10)),
      '法人・事業区分': '法人',
      対象店舗: COMPANY_WIDE,
      取引先: 'サンプル広告代理店',
      請求内容: '架空のWeb広告運用費(サンプル)',
      請求金額: 55000,
      支払方法: '銀行振込',
      '稟議・承認状況': '未承認',
      代表承認: '未承認',
      会計ソフト入力状況: '未入力',
      支払状況: '未払い',
      重要度: '中',
      備考: `${SAMPLE_MARK}動作確認用のサンプルです`,
      登録日時: nowStr,
    });
  }

  if (!hasData('CONTRACT')) {
    appendRecord('CONTRACT', {
      管理ID: `CTR-${ymCompact}-0001`,
      書類種別: '契約書',
      '契約・書類名': '架空の店舗賃貸借契約(サンプル)',
      '法人・事業区分': '法人',
      対象店舗: '店舗A(仮・要変更)',
      相手先: '(架空)不動産管理会社',
      契約開始日: formatDate(new Date(ymd.getFullYear() - 1, 3, 1)),
      契約終了日: formatDate(new Date(ymd.getFullYear() + 1, 2, 31)),
      自動更新有無: 'あり',
      解約通知期限: formatDate(new Date(ymd.getFullYear(), ymd.getMonth() + 2, 1)),
      ステータス: '未処理',
      重要度: '高',
      備考: `${SAMPLE_MARK}動作確認用のサンプルです`,
      登録日時: nowStr,
    });
  }

  if (!hasData('QUESTION')) {
    appendRecord('QUESTION', {
      質問ID: `QST-${ymCompact}-0001`,
      登録日: today,
      関連管理ID: `RCT-${ymCompact}-0001`,
      質問内容: '個人カードで立て替えた材料費の精算方法は?(架空の質問サンプル)',
      不明点: '立替精算のルールが未整備',
      確認先: '税理士',
      重要度: '中',
      ルール化の要否: '要',
      書類処理ルールへの反映状況: '未反映',
      ステータス: '未処理',
      備考: `${SAMPLE_MARK}動作確認用のサンプルです`,
      登録日時: nowStr,
    });
  }

  if (!hasData('FIXED_COST')) {
    appendRecord('FIXED_COST', {
      管理ID: 'FIX-0001',
      '法人・事業区分': '法人',
      対象店舗: '店舗A(仮・要変更)',
      費目: '家賃',
      支払先: '(架空)不動産管理会社',
      契約内容: '店舗A賃料(サンプル)',
      支払頻度: '毎月',
      通常金額: 220000,
      支払日: '27日',
      支払方法: '口座振替',
      自動更新: 'あり',
      ステータス: '未処理',
      備考: `${SAMPLE_MARK}動作確認用のサンプルです`,
      登録日時: nowStr,
    });
    appendRecord('FIXED_COST', {
      管理ID: 'FIX-0002',
      '法人・事業区分': '法人',
      対象店舗: COMPANY_WIDE,
      費目: '税理士顧問料',
      支払先: '(架空)税理士事務所',
      契約内容: '月次顧問料(サンプル)',
      支払頻度: '毎月',
      通常金額: 33000,
      支払日: '月末',
      支払方法: '銀行振込',
      ステータス: '未処理',
      備考: `${SAMPLE_MARK}動作確認用のサンプルです`,
      登録日時: nowStr,
    });
  }

  logger.info(
    'seedSampleData',
    'サンプルデータの投入を確認しました(既存データがあるシートはスキップ)',
  );
}

/** サンプルデータ(備考が SAMPLE_MARK で始まる行)を削除する */
export function deleteSampleData(): number {
  const targets: SheetKey[] = [
    'INTAKE',
    'RECEIPT',
    'INVOICE',
    'CONTRACT',
    'QUESTION',
    'FIXED_COST',
    'VENDOR',
    'BUSINESS',
    'STAFF',
  ];
  let deleted = 0;
  for (const key of targets) {
    const sheet = findSheet(key);
    if (!sheet) continue;
    const map = headerMap(sheet);
    const noteCol = map['備考'];
    if (!noteCol) continue;
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;
    const notes = sheet.getRange(2, noteCol, lastRow - 1, 1).getValues();
    // 下から削除(行番号のずれを防ぐ)
    for (let i = notes.length - 1; i >= 0; i--) {
      if (String(notes[i][0] ?? '').startsWith(SAMPLE_MARK)) {
        sheet.deleteRow(i + 2);
        deleted++;
      }
    }
  }
  logger.info('deleteSampleData', `サンプルデータを ${deleted} 行削除しました`);
  return deleted;
}
