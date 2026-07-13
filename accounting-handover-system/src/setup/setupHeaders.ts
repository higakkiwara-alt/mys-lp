/**
 * 見出し行の書式・固定行・フィルター・説明メモの設定(冪等)
 */
import { COLORS, SHEETS, SHEET_ORDER } from '../constants';
import { logger } from '../utils/logger';
import { findSheet, headerMap } from '../services/sheetService';

export function setupHeaders(): void {
  for (const key of SHEET_ORDER) {
    const def = SHEETS[key];
    if (def.headers.length === 0) continue; // ダッシュボードは対象外
    const sheet = findSheet(key);
    if (!sheet) continue;
    const lastCol = sheet.getLastColumn();
    if (lastCol === 0) continue;

    const headerRange = sheet.getRange(1, 1, 1, lastCol);
    headerRange
      .setBackground(COLORS.headerBg)
      .setFontColor(COLORS.headerFont)
      .setFontWeight('bold')
      .setVerticalAlignment('middle')
      .setWrap(true);
    sheet.setRowHeight(1, 40);
    if (sheet.getFrozenRows() < 1) sheet.setFrozenRows(1);

    // フィルター(既存があれば残す)
    if (!sheet.getFilter()) {
      sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 2), lastCol).createFilter();
    }

    // 説明メモ + 必須/自動入力の目印
    const map = headerMap(sheet);
    const notes = def.notes ?? {};
    for (const [header, col] of Object.entries(map)) {
      const cell = sheet.getRange(1, col);
      const parts: string[] = [];
      if (def.requiredCols?.includes(header)) parts.push('【必須】');
      if (def.autoCols?.includes(header)) parts.push('【自動入力】この列は手入力不要です。');
      if (notes[header]) parts.push(notes[header]);
      const note = parts.join('\n');
      if (note && cell.getNote() !== note) cell.setNote(note);
    }
  }
  logger.info('setupHeaders', '見出し行の書式・フィルター・メモを設定しました');
}
