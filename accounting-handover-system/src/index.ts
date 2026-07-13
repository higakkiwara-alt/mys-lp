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
import { parseYearMonth } from './utils/helpers';
import { errorMessage } from './utils/errors';
import { logger } from './utils/logger';

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
