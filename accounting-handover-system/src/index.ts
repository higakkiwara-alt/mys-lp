/**
 * エントリーポイント
 * Apps Script のトリガー・メニューから呼ばれる関数を globalThis へ公開する。
 * (esbuild で IIFE にバンドルされるため、公開しない関数は外から見えない)
 */
import { describeConfig } from './config';
import { runInitialSetup, repairSheets } from './setup/createWorkbook';
import { setupValidations } from './setup/setupValidations';
import { setupConditionalFormatting } from './setup/setupConditionalFormatting';
import { setupFormulas } from './setup/setupFormulas';
import { deleteSampleData } from './setup/setupSampleData';
import { handleOpen } from './handlers/onOpen';
import { handleEdit } from './handlers/onEdit';
import { handleFormSubmitEvent } from './handlers/onFormSubmit';
import { handleChangeEvent } from './handlers/onChange';
import { runDailyDeadlineCheck } from './jobs/dailyDeadlineCheck';
import { runIntegrityCheck } from './jobs/dataIntegrityCheck';
import { runMonthlyChecklistGeneration } from './jobs/monthlyChecklistGeneration';
import { generateChecklist } from './services/monthlyCloseService';
import { updateDashboard } from './services/dashboardService';
import { createDriveFolderStructure, logFolderStructure } from './services/driveService';
import { createIntakeForm } from './services/formService';
import { sendTestNotification } from './services/notificationService';
import { parseYearMonth, toYearMonthHyphen } from './utils/helpers';
import { errorMessage } from './utils/errors';
import { logger } from './utils/logger';
import { runIntegrationSync } from './jobs/integrationSync';
import { generateMonthlyReport, runMonthlyReportJob } from './jobs/monthlyReport';
import { importInvoicesFromGmail } from './services/gmailService';
import { fetchSquareSales } from './services/squareService';
import { importStatementsFromDrive } from './services/statementImportService';
import {
  applyApprovedClassifications,
  proposeFileClassifications,
} from './services/driveClassifyService';
import { exportJournalCandidates } from './services/accountingExportService';

const g = globalThis as Record<string, unknown>;

function alertSafe(message: string): void {
  try {
    SpreadsheetApp.getUi().alert('OTK経理管理', message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch {
    // UIが使えない文脈(トリガー実行時)はログのみ
    console.log(message);
  }
}

function withErrorAlert(name: string, fn: () => string | void): void {
  try {
    const msg = fn();
    if (msg) alertSafe(msg);
  } catch (e) {
    logger.error(name, `メニュー操作でエラー: ${errorMessage(e)}`, e);
    alertSafe(
      `エラーが発生しました:\n${errorMessage(e)}\n\n15_システムログに詳細を記録しました。docs/troubleshooting.md も参照してください。`,
    );
  }
}

// ===== トリガー(シンプル + インストーラブル) =====
g.onOpen = (): void => {
  handleOpen();
};
g.handleEditInstallable = (e: GoogleAppsScript.Events.SheetsOnEdit): void => {
  handleEdit(e);
};
g.handleFormSubmit = (e: GoogleAppsScript.Events.SheetsOnFormSubmit): void => {
  handleFormSubmitEvent(e);
};
g.handleChange = (e: GoogleAppsScript.Events.SheetsOnChange): void => {
  handleChangeEvent(e);
};

// ===== 時間主導ジョブ =====
g.jobDailyDeadlineCheck = (): void => {
  runDailyDeadlineCheck();
};
g.jobDataIntegrityCheck = (): void => {
  runIntegrityCheck();
};
g.jobMonthlyChecklist = (): void => {
  runMonthlyChecklistGeneration();
};
g.jobIntegrationSync = (): void => {
  runIntegrationSync();
};
g.jobMonthlyReport = (): void => {
  runMonthlyReportJob();
};

// ===== メニュー =====
g.menuInitialSetup = (): void => {
  withErrorAlert('menuInitialSetup', () => {
    const result = runInitialSetup();
    const lines = ['初期セットアップが完了しました。', `成功: ${result.succeeded.join('、')}`];
    if (result.failed.length > 0) {
      lines.push(
        `失敗: ${result.failed.map((f) => `${f.step}(${f.error})`).join('、')}`,
        '失敗したステップは個別メニューから再実行できます。',
      );
    }
    lines.push(
      '',
      '次の手順: 11_店舗・事業マスターと12_担当者マスターを実際の情報へ更新してください(README参照)。',
    );
    return lines.join('\n');
  });
};

g.menuRepairSheets = (): void => {
  withErrorAlert('menuRepairSheets', () => {
    repairSheets();
    return 'シート構成を修復しました(不足シート・不足列を追加。既存データは変更していません)。';
  });
};

g.menuReapplyValidations = (): void => {
  withErrorAlert('menuReapplyValidations', () => {
    setupValidations();
    return '入力規則を再設定しました。';
  });
};

g.menuReapplyFormulas = (): void => {
  withErrorAlert('menuReapplyFormulas', () => {
    setupFormulas();
    return '数式(ダッシュボード・レシート重複判定)を再設定しました。';
  });
};

g.menuReapplyConditionalFormatting = (): void => {
  withErrorAlert('menuReapplyConditionalFormatting', () => {
    setupConditionalFormatting();
    return '条件付き書式を再設定しました。';
  });
};

g.menuGenerateChecklist = (): void => {
  withErrorAlert('menuGenerateChecklist', () => {
    const ui = SpreadsheetApp.getUi();
    const res = ui.prompt(
      '月次チェックリストを作成',
      '対象年月を入力してください(例: 2026-08)。空欄の場合は当月分を作成します。',
      ui.ButtonSet.OK_CANCEL,
    );
    if (res.getSelectedButton() !== ui.Button.OK) return;
    const text = res.getResponseText().trim();
    const now = new Date();
    const ym = text ? parseYearMonth(text) : { year: now.getFullYear(), month: now.getMonth() + 1 };
    if (!ym) return '対象年月の形式が正しくありません(例: 2026-08)。';
    const added = generateChecklist(ym.year, ym.month);
    return added > 0
      ? `${ym.year}-${String(ym.month).padStart(2, '0')} のチェックリストを ${added} 件作成しました。`
      : `${ym.year}-${String(ym.month).padStart(2, '0')} のチェックリストは作成済みです(重複作成しません)。`;
  });
};

g.menuRunIntegrityCheck = (): void => {
  withErrorAlert('menuRunIntegrityCheck', () => {
    const result = runIntegrityCheck();
    return [
      'データ不整合チェックが完了しました。',
      `検出: ${result.detected} 件 / 新規登録: ${result.added} 件 / 解消: ${result.resolved} 件`,
      '詳細は 16_エラー・不整合一覧 を確認してください。',
    ].join('\n');
  });
};

g.menuUpdateDashboard = (): void => {
  withErrorAlert('menuUpdateDashboard', () => {
    updateDashboard();
    return 'ダッシュボードを更新しました。';
  });
};

g.menuCreateDriveFolders = (): void => {
  withErrorAlert('menuCreateDriveFolders', () => {
    const count = createDriveFolderStructure();
    logFolderStructure();
    return [
      `Driveフォルダ構成を確認・作成しました(${count}フォルダ)。`,
      '既存フォルダは再利用しています(重複作成しません)。',
      'ファイルの移動・削除は行いません(手動で整理してください)。',
    ].join('\n');
  });
};

g.menuCreateForm = (): void => {
  withErrorAlert('menuCreateForm', () => {
    const url = createIntakeForm();
    return [
      '受付フォームを作成(または確認)しました。',
      `編集URL: ${url}`,
      '注意: ファイルアップロード項目は組織設定の関係でスクリプトから追加できません。',
      '必要な場合はフォーム編集画面から手動で追加してください(README参照)。',
    ].join('\n');
  });
};

g.menuTestNotification = (): void => {
  withErrorAlert('menuTestNotification', () => sendTestNotification());
};

g.menuDeleteSampleData = (): void => {
  withErrorAlert('menuDeleteSampleData', () => {
    const ui = SpreadsheetApp.getUi();
    const res = ui.alert(
      'サンプルデータの削除',
      `備考が「【サンプル】」で始まる行をすべて削除します。よろしいですか?\n(実データは削除されません)`,
      ui.ButtonSet.YES_NO,
    );
    if (res !== ui.Button.YES) return;
    const deleted = deleteSampleData();
    return `サンプルデータを ${deleted} 行削除しました。`;
  });
};

g.menuShowConfig = (): void => {
  withErrorAlert('menuShowConfig', () => describeConfig());
};

// ===== Phase 2: 外部連携メニュー =====
g.menuImportGmail = (): void => {
  withErrorAlert('menuImportGmail', () => {
    const count = importInvoicesFromGmail();
    return [
      `Gmail取込が完了しました(添付 ${count} 件)。`,
      '結果は 21_Gmail取込 と 02_書類受付台帳 を確認してください。',
      count === 0
        ? '0件の場合: GMAIL_IMPORT_ENABLED=true の設定と、検索条件(GMAIL_SEARCH_QUERY)を確認してください。'
        : '取り込んだ書類の金額・支払期限・店舗を入力してください。',
    ].join('\n');
  });
};

g.menuFetchSquare = (): void => {
  withErrorAlert('menuFetchSquare', () => {
    const rows = fetchSquareSales(7);
    return [
      `Square売上を取得しました(日次 ${rows} 行を 17_売上データ取込 へ反映)。`,
      '売上の会計上の計上方法(総額/手数料控除後)は税理士に確認してください。',
    ].join('\n');
  });
};

g.menuImportStatements = (): void => {
  withErrorAlert('menuImportStatements', () => {
    const rows = importStatementsFromDrive();
    return [
      `明細CSV取込が完了しました(${rows} 行を 18_明細取込 へ追加)。`,
      '取込元: Drive「経理管理/04_銀行・カード明細/取込待ち」フォルダのCSVファイル。',
      '0件の場合: フォルダにCSVを置いたか、既に取込済みでないかを確認してください。',
    ].join('\n');
  });
};

g.menuProposeClassify = (): void => {
  withErrorAlert('menuProposeClassify', () => {
    const count = proposeFileClassifications();
    return [
      `ファイル分類の提案を ${count} 件作成しました(20_ファイル分類提案)。`,
      'この時点ではファイルは移動していません。',
      '内容を確認し、問題なければステータスを「承認」にして「承認済みのファイル分類を実行」を実行してください。',
    ].join('\n');
  });
};

g.menuApplyClassify = (): void => {
  withErrorAlert('menuApplyClassify', () => {
    const ui = SpreadsheetApp.getUi();
    const res = ui.alert(
      'ファイル分類の実行',
      '20_ファイル分類提案でステータスが「承認」の行について、ファイルの移動と改名を実行します。よろしいですか?',
      ui.ButtonSet.YES_NO,
    );
    if (res !== ui.Button.YES) return;
    const count = applyApprovedClassifications();
    return `承認済みの分類を ${count} 件実行しました。エラーがある場合は「エラー」列を確認してください。`;
  });
};

g.menuExportJournal = (): void => {
  withErrorAlert('menuExportJournal', () => {
    const ui = SpreadsheetApp.getUi();
    const res = ui.prompt(
      '仕訳候補CSVを出力',
      '対象年月を入力してください(例: 2026-07)。空欄の場合は当月分を出力します。',
      ui.ButtonSet.OK_CANCEL,
    );
    if (res.getSelectedButton() !== ui.Button.OK) return;
    const text = res.getResponseText().trim();
    const ym = text ? text : toYearMonthHyphen(new Date());
    if (!parseYearMonth(ym)) return '対象年月の形式が正しくありません(例: 2026-07)。';
    const result = exportJournalCandidates(ym);
    return result.count > 0
      ? [
          `${ym} の仕訳候補CSVを出力しました(${result.count}行)。`,
          `保存先: ${result.url}`,
          '勘定科目・税区分は候補です。会計ソフトのインポート画面で確認のうえ取り込んでください。',
        ].join('\n')
      : `${ym} の仕訳候補は0件でした(レシート・請求書の日付と金額を確認してください)。`;
  });
};

g.menuMonthlyReport = (): void => {
  withErrorAlert('menuMonthlyReport', () => {
    const ui = SpreadsheetApp.getUi();
    const res = ui.prompt(
      '月次経営レポートを作成',
      '対象年月を入力してください(例: 2026-06)。空欄の場合は前月分を作成します。',
      ui.ButtonSet.OK_CANCEL,
    );
    if (res.getSelectedButton() !== ui.Button.OK) return;
    const text = res.getResponseText().trim();
    let ym: string;
    if (text) {
      if (!parseYearMonth(text)) return '対象年月の形式が正しくありません(例: 2026-06)。';
      ym = text;
    } else {
      const now = new Date();
      ym = toYearMonthHyphen(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    }
    const stores = generateMonthlyReport(ym);
    return stores > 0
      ? `${ym} の店舗別月次集計を作成しました(${stores}店舗)。19_店舗別月次集計 を確認してください。`
      : `${ym} の集計対象データがありませんでした(売上取込・レシート・請求書を確認してください)。`;
  });
};
