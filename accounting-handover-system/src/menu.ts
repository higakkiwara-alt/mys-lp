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
    .addSubMenu(
      ui
        .createMenu('外部連携(Phase 2)')
        .addItem('Gmail請求書を取り込む', 'menuImportGmail')
        .addItem('Square売上を取得(直近7日)', 'menuFetchSquare')
        .addItem('明細CSVを取り込む', 'menuImportStatements')
        .addItem('明細の突合候補を検索', 'menuSuggestReconciliation')
        .addSeparator()
        .addItem('ファイル分類を提案', 'menuProposeClassify')
        .addItem('承認済みのファイル分類を実行', 'menuApplyClassify')
        .addSeparator()
        .addItem('仕訳候補CSVを出力', 'menuExportJournal')
        .addItem('月次経営レポートを作成', 'menuMonthlyReport'),
    )
    .addSeparator()
    .addItem('通知テスト', 'menuTestNotification')
    .addItem('サンプルデータを削除', 'menuDeleteSampleData')
    .addItem('システム設定を確認', 'menuShowConfig')
    .addToUi();
}
