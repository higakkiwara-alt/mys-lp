/**
 * 型定義
 */

/** シートの論理キー */
export type SheetKey =
  | 'DASHBOARD'
  | 'INTAKE'
  | 'RECEIPT'
  | 'INVOICE'
  | 'CONTRACT'
  | 'RULE'
  | 'QUESTION'
  | 'MONTHLY_CLOSE'
  | 'FIXED_COST'
  | 'VENDOR'
  | 'BUSINESS'
  | 'STAFF'
  | 'SETTINGS'
  | 'CHANGE_LOG'
  | 'SYSTEM_LOG'
  | 'ERROR_LIST'
  | 'FORM_INBOX'
  | 'SQUARE_SALES'
  | 'STATEMENT'
  | 'STORE_PL'
  | 'FILE_CLASSIFY'
  | 'GMAIL_LOG';

/** 入力規則の定義 */
export interface ValidationDef {
  /** 対象列のヘッダー名 */
  header: string;
  /** 13_設定・選択肢マスターのカテゴリ名から選択肢を取る場合 */
  settingsCategory?: string;
  /** マスターシートの列を参照する場合(動的レンジ参照) */
  masterRef?: { sheetKey: SheetKey; header: string };
  /** チェックボックスにする場合 */
  checkbox?: boolean;
}

/** シート定義 */
export interface SheetDef {
  key: SheetKey;
  name: string;
  headers: string[];
  /** 管理IDのプレフィックス(例: ACC)。無い場合は自動採番対象外 */
  idPrefix?: string;
  /** IDに YYYYMM を含めるか(false なら通し番号) */
  idWithMonth?: boolean;
  /** 日付形式にする列(ヘッダー名) */
  dateCols?: string[];
  /** 日時形式にする列 */
  datetimeCols?: string[];
  /** 金額(円)形式にする列 */
  currencyCols?: string[];
  /** 折り返し表示にする列 */
  wrapCols?: string[];
  /** 必須入力列(見出しに印を付ける) */
  requiredCols?: string[];
  /** 自動入力列(スクリプトが書く列。見出しに印を付ける) */
  autoCols?: string[];
  /** 入力規則 */
  validations?: ValidationDef[];
  /** シート全体を保護(警告表示)するか */
  protect?: boolean;
  /** 変更履歴の記録対象列 */
  logCols?: string[];
  /** 説明メモ { ヘッダー名: メモ本文 } */
  notes?: Record<string, string>;
}

/** 書類処理ルールの初期データ(不足項目はデフォルトで補完する) */
export interface RuleSeed {
  category: string;
  examples: string;
  firstAction?: string;
  registerTo?: string;
  requiredFields?: string;
  originalStorage?: string;
  driveFolder?: string;
  reportTo?: string;
  approver?: string;
  shareTax?: string;
  shareLabor?: string;
  accounting?: string;
  deadline?: string;
  doneCondition?: string;
  whenUnsure?: string;
  taxCheck?: string;
  caution?: string;
}

/** 月次チェックリスト項目定義 */
export interface ChecklistItemDef {
  item: string;
  /** store: 有効店舗ごとに生成 / company: 全社で1件 */
  scope: 'store' | 'company';
  /** 期限 = 翌月n日 */
  dueDay: number;
}

/** データ不整合 */
export interface IntegrityIssue {
  type: string;
  severity: '緊急' | '高' | '中' | '低';
  sheetName: string;
  manageId: string;
  problem: string;
  fix: string;
}

/** 不整合検出に渡す行データ(ヘッダー名 → 値) */
export type RowRecord = Record<string, unknown>;

/** システム設定 */
export interface AppConfig {
  companyName: string;
  spreadsheetId: string;
  driveRootFolderId: string;
  driveRootFolderName: string;
  ceoEmail: string;
  accountingEmail: string;
  taxAccountantEmail: string;
  laborConsultantEmail: string;
  notificationEnabled: boolean;
  notificationHour: number;
  deadlineWarnDays: number;
  contractWarnDays: number;
  timezone: string;
  mode: 'test' | 'production';
}

/** 通知1件分 */
export interface NotificationItem {
  manageId: string;
  content: string;
  deadline: string;
  assignee: string;
}
