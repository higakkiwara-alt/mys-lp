/**
 * 入力規則(プルダウン・チェックボックス)の設定(冪等)
 * - 設定・選択肢マスターのカテゴリ → 値リストのプルダウン
 *   (マスター変更後はメニュー「入力規則を再設定」で反映)
 * - 店舗・担当者・取引先 → マスターシートの列を範囲参照(常に最新)
 */
import { SHEETS, SHEET_ORDER } from '../constants';
import { logger } from '../utils/logger';
import { getOptions } from '../services/masterDataService';
import { findSheet, headerMap, getSs } from '../services/sheetService';

const RULE_ROWS = 1000;

export function setupValidations(): void {
  const ss = getSs();
  const optionCache = new Map<string, string[]>();
  const options = (category: string): string[] => {
    if (!optionCache.has(category)) optionCache.set(category, getOptions(category));
    return optionCache.get(category)!;
  };

  for (const key of SHEET_ORDER) {
    const def = SHEETS[key];
    if (!def.validations || def.validations.length === 0) continue;
    const sheet = findSheet(key);
    if (!sheet) continue;
    const map = headerMap(sheet);
    const rows = Math.min(Math.max(sheet.getMaxRows() - 1, 1), RULE_ROWS);

    for (const v of def.validations) {
      const col = map[v.header];
      if (!col) continue;
      const range = sheet.getRange(2, col, rows, 1);
      if (v.checkbox) {
        range.insertCheckboxes();
        continue;
      }
      let rule: GoogleAppsScript.Spreadsheet.DataValidation | null = null;
      if (v.settingsCategory) {
        const values = options(v.settingsCategory);
        if (values.length === 0) continue;
        rule = SpreadsheetApp.newDataValidation()
          .requireValueInList(values, true)
          .setAllowInvalid(true) // 移行期の既存データを壊さないため警告に留める
          .setHelpText(
            `「${v.settingsCategory}」の選択肢から選んでください(13_設定・選択肢マスターで管理)`,
          )
          .build();
      } else if (v.masterRef) {
        const masterSheet = findSheet(v.masterRef.sheetKey);
        if (!masterSheet) continue;
        const mMap = headerMap(masterSheet);
        const mCol = mMap[v.masterRef.header];
        if (!mCol) continue;
        const refRange = masterSheet.getRange(
          2,
          mCol,
          Math.max(masterSheet.getMaxRows() - 1, 1),
          1,
        );
        rule = SpreadsheetApp.newDataValidation()
          .requireValueInRange(refRange, true)
          .setAllowInvalid(true)
          .setHelpText(
            `${SHEETS[v.masterRef.sheetKey].name} の「${v.masterRef.header}」から選んでください`,
          )
          .build();
      }
      if (rule) range.setDataValidation(rule);
    }
  }
  SpreadsheetApp.flush();
  logger.info('setupValidations', `入力規則を設定しました(${ss.getName()})`);
}
