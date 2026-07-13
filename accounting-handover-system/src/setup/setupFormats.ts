/**
 * 列の表示形式の設定(冪等)
 * 日付・日時・金額・折り返し・自動入力列の背景色など。
 */
import { COLORS, SHEETS, SHEET_ORDER } from '../constants';
import { logger } from '../utils/logger';
import { findSheet, headerMap } from '../services/sheetService';

const FORMAT_ROWS = 1000; // 書式を適用するデータ行数

export function setupFormats(): void {
  for (const key of SHEET_ORDER) {
    const def = SHEETS[key];
    if (def.headers.length === 0) continue;
    const sheet = findSheet(key);
    if (!sheet) continue;
    const map = headerMap(sheet);
    const rows = Math.min(Math.max(sheet.getMaxRows() - 1, 1), FORMAT_ROWS);

    const applyTo = (
      headers: string[] | undefined,
      fn: (r: GoogleAppsScript.Spreadsheet.Range) => void,
    ): void => {
      for (const h of headers ?? []) {
        const col = map[h];
        if (!col) continue;
        fn(sheet.getRange(2, col, rows, 1));
      }
    };

    applyTo(def.dateCols, (r) => r.setNumberFormat('yyyy-mm-dd'));
    applyTo(def.datetimeCols, (r) => r.setNumberFormat('yyyy-mm-dd hh:mm:ss'));
    applyTo(def.currencyCols, (r) => r.setNumberFormat('¥#,##0'));
    applyTo(def.wrapCols, (r) => r.setWrap(true));
    // 必須列は薄い黄色、自動入力列は薄い灰色(重複時は自動入力を優先)
    applyTo(def.requiredCols, (r) => r.setBackground(COLORS.requiredBg));
    applyTo(def.autoCols, (r) => r.setBackground(COLORS.autoBg));

    // 列幅: 長文列は広く、その他は標準
    for (const [header, col] of Object.entries(map)) {
      if (def.wrapCols?.includes(header)) {
        sheet.setColumnWidth(col, 260);
      } else if (
        def.dateCols?.includes(header) ||
        def.datetimeCols?.includes(header) ||
        def.currencyCols?.includes(header)
      ) {
        sheet.setColumnWidth(col, 120);
      } else {
        sheet.setColumnWidth(col, 140);
      }
    }
  }
  logger.info('setupFormats', '表示形式・列幅を設定しました');
}
