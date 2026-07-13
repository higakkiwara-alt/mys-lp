/**
 * Googleフォームサービス
 * 書類・レシート受付フォームを自動作成し、回答を中間シート経由で
 * 02_書類受付台帳へ取り込む。
 * 注意: ファイルアップロード項目は Google Workspace の組織設定に依存するため
 * スクリプトからは作成できない(FormApp 未対応)。READMEに手動設定手順を記載。
 */
import { SHEETS } from '../constants';
import { CONFIG_KEYS, getConfig, setConfigValue } from '../config';
import { getOptions, getActiveStoreNames } from './masterDataService';
import { logger } from '../utils/logger';

export const FORM_TITLE = 'OTK経理 書類・レシート受付フォーム';

/**
 * 受付フォームを作成する(冪等: 作成済みのフォームIDが設定にあれば再利用)。
 * 戻り値: フォームの編集URL
 */
export function createIntakeForm(): string {
  const cfg = getConfig();
  const existingId = PropertiesService.getScriptProperties().getProperty(CONFIG_KEYS.FORM_ID);
  if (existingId) {
    try {
      const form = FormApp.openById(existingId);
      return form.getEditUrl();
    } catch {
      logger.warn('createIntakeForm', '既存フォームを開けないため新規作成します');
    }
  }

  const form = FormApp.create(
    `${cfg.companyName === 'OTK COMPANY' ? 'OTK' : cfg.companyName}経理 書類・レシート受付フォーム`,
  );
  form.setDescription(
    [
      '書類・レシートを受け取ったら、その日のうちにこのフォームから登録してください。',
      '原本は捨てずに保管し、画像は経理管理Driveの「00_未分類・新規受付」へアップロードしてください。',
      '判断に迷う場合も、まず「その他」で登録してください(放置しない)。',
    ].join('\n'),
  );

  form.addTextItem().setTitle('登録者').setRequired(true);
  const bizItem = form.addListItem().setTitle('法人・事業区分').setRequired(true);
  bizItem.setChoiceValues(
    orDefault(getOptions('法人・事業区分'), ['法人', '個人事業', '判断不明']),
  );
  const storeItem = form.addListItem().setTitle('対象店舗').setRequired(true);
  storeItem.setChoiceValues(orDefault(getActiveStoreNames(), ['(店舗マスター未設定)']));
  const typeItem = form.addListItem().setTitle('書類種別').setRequired(true);
  typeItem.setChoiceValues(
    orDefault(getOptions('書類種別'), ['レシート', '領収書', '請求書', 'その他']),
  );
  form.addDateItem().setTitle('書類発行日');
  form.addTextItem().setTitle('購入先・発行元').setRequired(true);
  form.addTextItem().setTitle('金額').setHelpText('数字のみ(例: 5500)。不明な場合は空欄。');
  const payItem = form.addListItem().setTitle('支払方法');
  payItem.setChoiceValues(
    orDefault(getOptions('支払方法'), ['現金', '銀行振込', 'クレジットカード', 'その他']),
  );
  form.addParagraphTextItem().setTitle('利用目的・書類内容').setRequired(true);
  form
    .addTextItem()
    .setTitle('書類画像またはファイル')
    .setHelpText(
      'DriveへアップロードしたファイルのURLを貼ってください。ファイルアップロード項目は組織設定により手動追加が必要です(README参照)。',
    );
  const sevItem = form.addListItem().setTitle('重要度');
  sevItem.setChoiceValues(orDefault(getOptions('重要度'), ['緊急', '高', '中', '低']));
  form.addParagraphTextItem().setTitle('備考');

  // 回答先を本スプレッドシートに設定(専用の回答シートが自動作成される)
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) {
    form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  }
  setConfigValue(CONFIG_KEYS.FORM_ID, form.getId());
  logger.info('createIntakeForm', `受付フォームを作成しました: ${form.getEditUrl()}`);
  return form.getEditUrl();
}

function orDefault(values: string[], fallback: string[]): string[] {
  return values.length > 0 ? values : fallback;
}

/**
 * フォーム回答(onFormSubmit の namedValues)を02_書類受付台帳のレコードへ変換する(純関数)
 */
export function mapFormAnswerToIntake(named: Record<string, string[]>): Record<string, unknown> {
  const get = (title: string): string => (named[title]?.[0] ?? '').trim();
  const amount = get('金額').replace(/[,¥\s円]/g, '');
  return {
    受付日: get('タイムスタンプ').split(' ')[0] || '',
    法人・事業区分: get('法人・事業区分'),
    対象店舗: get('対象店舗'),
    書類種別: get('書類種別'),
    書類発行日: get('書類発行日'),
    '発行元・取引先': get('購入先・発行元'),
    金額: amount === '' ? '' : Number(amount),
    支払方法: get('支払方法'),
    '書類名・内容': get('利用目的・書類内容'),
    'Google Driveリンク': get('書類画像またはファイル'),
    受領者: get('登録者'),
    重要度: get('重要度') || '中',
    現在のステータス: '未処理',
    備考: get('備考') ? `フォーム受付: ${get('備考')}` : 'フォーム受付',
  };
}

/** フォームの回答シート名の目印(setDestination が作るシートは「フォームの回答」で始まる) */
export function isFormResponseSheet(sheetName: string): boolean {
  return sheetName.startsWith('フォームの回答') || sheetName === SHEETS.FORM_INBOX.name;
}
