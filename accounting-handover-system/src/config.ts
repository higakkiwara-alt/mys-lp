/**
 * 設定管理
 * 会社固有の値(メールアドレス・フォルダID等)はコードに書かず、
 * Script Properties で管理する。未設定時は安全なデフォルトを使う。
 */
import type { AppConfig } from './types';
import { ConfigError } from './utils/errors';

/** Script Properties のキー一覧 */
export const CONFIG_KEYS = {
  COMPANY_NAME: 'COMPANY_NAME',
  SPREADSHEET_ID: 'SPREADSHEET_ID',
  DRIVE_ROOT_FOLDER_ID: 'DRIVE_ROOT_FOLDER_ID',
  DRIVE_ROOT_FOLDER_NAME: 'DRIVE_ROOT_FOLDER_NAME',
  CEO_EMAIL: 'CEO_EMAIL',
  ACCOUNTING_EMAIL: 'ACCOUNTING_EMAIL',
  TAX_ACCOUNTANT_EMAIL: 'TAX_ACCOUNTANT_EMAIL',
  LABOR_CONSULTANT_EMAIL: 'LABOR_CONSULTANT_EMAIL',
  NOTIFICATION_ENABLED: 'NOTIFICATION_ENABLED',
  NOTIFICATION_HOUR: 'NOTIFICATION_HOUR',
  DEADLINE_WARN_DAYS: 'DEADLINE_WARN_DAYS',
  CONTRACT_WARN_DAYS: 'CONTRACT_WARN_DAYS',
  TIMEZONE: 'TIMEZONE',
  MODE: 'MODE',
  FORM_ID: 'FORM_ID',
  // ===== Phase 2: 外部連携(未設定の機能は自動的にスキップされる) =====
  GMAIL_IMPORT_ENABLED: 'GMAIL_IMPORT_ENABLED',
  GMAIL_SEARCH_QUERY: 'GMAIL_SEARCH_QUERY',
  SQUARE_ACCESS_TOKEN: 'SQUARE_ACCESS_TOKEN',
  SQUARE_ENVIRONMENT: 'SQUARE_ENVIRONMENT',
  VISION_API_KEY: 'VISION_API_KEY',
  N8N_WEBHOOK_URL: 'N8N_WEBHOOK_URL',
} as const;

/** Phase 2 外部連携の設定 */
export interface IntegrationConfig {
  gmailImportEnabled: boolean;
  gmailSearchQuery: string;
  squareAccessToken: string;
  squareEnvironment: 'production' | 'sandbox';
  visionApiKey: string;
  n8nWebhookUrl: string;
}

/** 外部連携設定を読み込む */
export function getIntegrationConfig(): IntegrationConfig {
  const p = PropertiesService.getScriptProperties().getProperties();
  return {
    gmailImportEnabled: (p[CONFIG_KEYS.GMAIL_IMPORT_ENABLED] ?? '').toLowerCase() === 'true',
    gmailSearchQuery:
      p[CONFIG_KEYS.GMAIL_SEARCH_QUERY]?.trim() ||
      'has:attachment (請求書 OR 請求 OR invoice OR 御請求) newer_than:30d',
    squareAccessToken: p[CONFIG_KEYS.SQUARE_ACCESS_TOKEN]?.trim() || '',
    squareEnvironment:
      p[CONFIG_KEYS.SQUARE_ENVIRONMENT]?.trim() === 'sandbox' ? 'sandbox' : 'production',
    visionApiKey: p[CONFIG_KEYS.VISION_API_KEY]?.trim() || '',
    n8nWebhookUrl: p[CONFIG_KEYS.N8N_WEBHOOK_URL]?.trim() || '',
  };
}

const DEFAULTS: AppConfig = {
  companyName: 'OTK COMPANY',
  spreadsheetId: '',
  driveRootFolderId: '',
  driveRootFolderName: '経理管理',
  ceoEmail: '',
  accountingEmail: '',
  taxAccountantEmail: '',
  laborConsultantEmail: '',
  notificationEnabled: false, // 誤送信防止のため初期値は無効。設定で有効化する
  notificationHour: 8,
  deadlineWarnDays: 3,
  contractWarnDays: 30,
  timezone: 'Asia/Tokyo',
  mode: 'test', // 初期はテストモード。本番運用開始時に production へ
};

function props(): GoogleAppsScript.Properties.Properties {
  return PropertiesService.getScriptProperties();
}

/** 設定を読み込む(未設定はデフォルト) */
export function getConfig(): AppConfig {
  const p = props().getProperties();
  const num = (k: string, d: number): number => {
    const v = Number(p[k]);
    return isFinite(v) && v > 0 ? v : d;
  };
  return {
    companyName: p[CONFIG_KEYS.COMPANY_NAME]?.trim() || DEFAULTS.companyName,
    spreadsheetId: p[CONFIG_KEYS.SPREADSHEET_ID]?.trim() || DEFAULTS.spreadsheetId,
    driveRootFolderId: p[CONFIG_KEYS.DRIVE_ROOT_FOLDER_ID]?.trim() || DEFAULTS.driveRootFolderId,
    driveRootFolderName:
      p[CONFIG_KEYS.DRIVE_ROOT_FOLDER_NAME]?.trim() || DEFAULTS.driveRootFolderName,
    ceoEmail: p[CONFIG_KEYS.CEO_EMAIL]?.trim() || DEFAULTS.ceoEmail,
    accountingEmail: p[CONFIG_KEYS.ACCOUNTING_EMAIL]?.trim() || DEFAULTS.accountingEmail,
    taxAccountantEmail: p[CONFIG_KEYS.TAX_ACCOUNTANT_EMAIL]?.trim() || DEFAULTS.taxAccountantEmail,
    laborConsultantEmail:
      p[CONFIG_KEYS.LABOR_CONSULTANT_EMAIL]?.trim() || DEFAULTS.laborConsultantEmail,
    notificationEnabled: (p[CONFIG_KEYS.NOTIFICATION_ENABLED] ?? '').toLowerCase() === 'true',
    notificationHour: num(CONFIG_KEYS.NOTIFICATION_HOUR, DEFAULTS.notificationHour),
    deadlineWarnDays: num(CONFIG_KEYS.DEADLINE_WARN_DAYS, DEFAULTS.deadlineWarnDays),
    contractWarnDays: num(CONFIG_KEYS.CONTRACT_WARN_DAYS, DEFAULTS.contractWarnDays),
    timezone: p[CONFIG_KEYS.TIMEZONE]?.trim() || DEFAULTS.timezone,
    mode: p[CONFIG_KEYS.MODE]?.trim() === 'production' ? 'production' : 'test',
  };
}

/** 設定値を保存 */
export function setConfigValue(key: string, value: string): void {
  props().setProperty(key, value);
}

/** 通知に必要な設定が揃っているか検証(不足時は分かりやすいエラー) */
export function assertNotificationConfig(cfg: AppConfig): void {
  if (!cfg.notificationEnabled) {
    throw new ConfigError(
      `通知が無効です。Script Properties の ${CONFIG_KEYS.NOTIFICATION_ENABLED} を true に設定してください。`,
    );
  }
  if (!cfg.ceoEmail && !cfg.accountingEmail) {
    throw new ConfigError(
      `通知先が未設定です。Script Properties の ${CONFIG_KEYS.CEO_EMAIL} または ${CONFIG_KEYS.ACCOUNTING_EMAIL} にメールアドレスを設定してください。`,
    );
  }
}

/** 現在の設定を人間向けの文字列にする(メニュー「システム設定を確認」用) */
export function describeConfig(): string {
  const cfg = getConfig();
  const ic = getIntegrationConfig();
  const mask = (s: string): string => (s ? s.replace(/^(.{2}).*(@.*)$/, '$1***$2') : '(未設定)');
  return [
    `会社名: ${cfg.companyName}`,
    `モード: ${cfg.mode === 'production' ? '本番' : 'テスト'}`,
    `通知: ${cfg.notificationEnabled ? '有効' : '無効'}(毎日${cfg.notificationHour}時ごろ)`,
    `代表メール: ${mask(cfg.ceoEmail)}`,
    `経理メール: ${mask(cfg.accountingEmail)}`,
    `税理士メール: ${mask(cfg.taxAccountantEmail)}`,
    `社労士メール: ${mask(cfg.laborConsultantEmail)}`,
    `期限警告日数: ${cfg.deadlineWarnDays}日前`,
    `契約更新警告日数: ${cfg.contractWarnDays}日前`,
    `DriveルートフォルダID: ${cfg.driveRootFolderId || '(未作成。メニューから作成できます)'}`,
    `Driveルートフォルダ名: ${cfg.driveRootFolderName}`,
    `タイムゾーン: ${cfg.timezone}`,
    '',
    '--- 外部連携(Phase 2) ---',
    `Gmail取込: ${ic.gmailImportEnabled ? '有効' : '無効(GMAIL_IMPORT_ENABLED=true で有効化)'}`,
    `Square連携: ${ic.squareAccessToken ? `設定済み(${ic.squareEnvironment})` : '未設定(SQUARE_ACCESS_TOKEN)'}`,
    `レシートOCR: ${ic.visionApiKey ? '設定済み' : '未設定(VISION_API_KEY)'}`,
    `n8n Webhook: ${ic.n8nWebhookUrl ? '設定済み' : '未設定(N8N_WEBHOOK_URL)'}`,
    '',
    '設定変更: 拡張機能 → Apps Script → プロジェクトの設定 → スクリプト プロパティ',
  ].join('\n');
}
