/**
 * カスタムメニュー「OTK経理管理」
 * メニュー項目は index.ts で globalThis へ公開された関数名を指す。
 */
export const MENU_TITLE = 'OTK経理管理';

export function buildMenu(): void {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu(MENU_TITLE)
    .addItem('初期セットアップ', 'menuInitialSetup')
    .addSeparator()
    .addItem('シート構成を修復', 'menuRepairSheets')
    .addItem('入力規則を再設定', 'menuReapplyValidations')
    .addItem('数式を再設定', 'menuReapplyFormulas')
    .addItem('条件付き書式を再設定', 'menuReapplyConditionalFormatting')
    .addSeparator()
    .addItem('月次チェックリストを作成', 'menuGenerateChecklist')
    .addItem('データ不整合を確認', 'menuRunIntegrityCheck')
    .addItem('ダッシュボードを更新', 'menuUpdateDashboard')
    .addSeparator()
    .addItem('Driveフォルダを作成', 'menuCreateDriveFolders')
    .addItem('受付フォームを作成', 'menuCreateForm')
    .addSeparator()
    .addItem('通知テスト', 'menuTestNotification')
    .addItem('サンプルデータを削除', 'menuDeleteSampleData')
    .addItem('システム設定を確認', 'menuShowConfig')
    .addToUi();
}
