/**
 * 銀行・カード明細CSV取込サービス
 * Drive の 04_銀行・カード明細/取込待ち フォルダに置かれたCSVを解析し、
 * 18_明細取込 へ追記する(内容ハッシュの取込キーで冪等)。
 * - 銀行に汎用APIが無いため「CSVをダウンロードして置く」半自動方式を採用(制限事項)
 * - 元のCSVファイルは削除・移動しない(処理済みはファイルIDで記録)
 */
import { parseStatementCsv, statementKey } from '../utils/csv';
import { formatDateTime } from '../utils/helpers';
import { errorMessage } from '../utils/errors';
import { logger } from '../utils/logger';
import { ensureRootFolder } from './driveService';
import { ensureSheet, readRecords } from './sheetService';

const INBOX_PATH = ['04_銀行・カード明細', '取込待ち'];
const PROCESSED_PROP = 'STATEMENT_PROCESSED_FILE_IDS';

function getInboxFolder(): GoogleAppsScript.Drive.Folder {
  let folder = ensureRootFolder();
  for (const name of INBOX_PATH) {
    const it = folder.getFoldersByName(name);
    folder = it.hasNext() ? it.next() : folder.createFolder(name);
  }
  return folder;
}

function readProcessedIds(): Set<string> {
  const raw = PropertiesService.getScriptProperties().getProperty(PROCESSED_PROP) ?? '';
  return new Set(raw.split(',').filter((s) => s !== ''));
}

function saveProcessedIds(ids: Set<string>): void {
  // Properties の 9KB 制限対策: 直近500件のみ保持(取込キーでも重複防止しているため安全)
  const arr = Array.from(ids).slice(-500);
  PropertiesService.getScriptProperties().setProperty(PROCESSED_PROP, arr.join(','));
}

/** ファイル名から種別と口座名を推定する(純関数) */
export function guessStatementSource(fileName: string): { kind: string; account: string } {
  const base = String(fileName ?? '').replace(/\.[^.]+$/, '');
  const isCard = /(カード|card|visa|master|jcb|amex)/i.test(base);
  return { kind: isCard ? 'クレジットカード' : '銀行', account: base.slice(0, 40) };
}

/** 取込待ちフォルダのCSVをすべて取り込む。戻り値: 追加した明細行数 */
export function importStatementsFromDrive(): number {
  const sheet = ensureSheet('STATEMENT');
  const inbox = getInboxFolder();
  const processedFiles = readProcessedIds();
  const existingKeys = new Set(
    readRecords('STATEMENT').map((r) => String(r.record['取込キー'] ?? '').trim()),
  );

  let added = 0;
  let fileCount = 0;
  const files = inbox.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    if (!/\.(csv|txt)$/i.test(name)) continue;
    if (processedFiles.has(file.getId())) continue;
    fileCount++;
    try {
      // 文字コード: UTF-8 → 解析できなければ Shift_JIS を試す(国内銀行CSVに多い)
      let rows = parseStatementCsv(file.getBlob().getDataAsString('UTF-8'));
      if (rows.length === 0) {
        rows = parseStatementCsv(file.getBlob().getDataAsString('Shift_JIS'));
      }
      if (rows.length === 0) {
        logger.warn(
          'importStatementsFromDrive',
          `明細CSVを解析できませんでした: ${name}(列名が非対応の可能性)`,
        );
        processedFiles.add(file.getId());
        continue;
      }
      const src = guessStatementSource(name);
      const nowStr = formatDateTime(new Date());
      const batchKeyCount = new Map<string, number>();
      const newRows: unknown[][] = [];
      for (const row of rows) {
        let key = statementKey(src.account, row);
        // 同一ファイル内の完全同一行(同日同額の複数取引)には連番を付ける
        const n = (batchKeyCount.get(key) ?? 0) + 1;
        batchKeyCount.set(key, n);
        if (n > 1) key = `${key}-${n}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        newRows.push([
          key,
          src.kind,
          src.account,
          row.date,
          row.description,
          row.deposit,
          row.withdrawal,
          row.balance,
          '未突合',
          '',
          name,
          nowStr,
          '',
        ]);
      }
      if (newRows.length > 0) {
        sheet
          .getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length)
          .setValues(newRows);
        added += newRows.length;
      }
      processedFiles.add(file.getId());
    } catch (e) {
      logger.error('importStatementsFromDrive', `CSV取込に失敗: ${name} - ${errorMessage(e)}`, e);
    }
  }
  saveProcessedIds(processedFiles);
  logger.info(
    'importStatementsFromDrive',
    `明細取込完了: ${fileCount}ファイルから ${added} 行を追加しました(フォルダ: 経理管理/${INBOX_PATH.join('/')})`,
  );
  return added;
}
