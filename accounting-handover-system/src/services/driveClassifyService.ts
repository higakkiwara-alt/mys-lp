/**
 * Drive自動分類サービス
 * 00_未分類・新規受付 のファイルを解析して分類「提案」を作り(20_ファイル分類提案)、
 * 人間が「承認」した提案だけを実行(移動・改名)する。
 * 自動でのファイル移動・改名・削除は一切行わない(人間の承認が必須)。
 */
import { buildFileName, formatDate, formatDateTime, isBlank } from '../utils/helpers';
import { errorMessage } from '../utils/errors';
import { logger } from '../utils/logger';
import { ensureRootFolder } from './driveService';
import { assignIdToRow } from './idService';
import { isOcrTarget, ocrImageFile, parseReceiptText, type ReceiptGuess } from './ocrService';
import { getIntegrationConfig } from '../config';
import { appendRecord, colOf, ensureSheet, readRecords } from './sheetService';

/** ファイル名・OCR結果から分類先を推定する(純関数・テスト対象) */
export function suggestClassification(
  fileName: string,
  ocrText: string,
): { docType: string; folder: string } {
  const src = `${fileName} ${ocrText}`.toLowerCase();
  const rules: Array<{ keywords: string[]; docType: string; folder: string }> = [
    { keywords: ['請求書', '御請求', 'invoice', '請求'], docType: '請求書', folder: '02_請求書' },
    {
      keywords: ['領収書', '領収証', 'レシート', 'receipt'],
      docType: '領収書',
      folder: '01_レシート・領収書',
    },
    {
      keywords: ['見積', 'estimate', 'quotation'],
      docType: '見積書',
      folder: '00_未分類・新規受付',
    },
    { keywords: ['納品書', '納品'], docType: '納品書', folder: '02_請求書' },
    {
      keywords: ['契約書', '契約', '覚書', '合意書'],
      docType: '契約書',
      folder: '06_契約書/その他',
    },
    { keywords: ['給与', '賞与', '賃金'], docType: '給与関係書類', folder: '08_給与・報酬' },
    { keywords: ['square', 'スクエア'], docType: 'Square関係書類', folder: '05_売上資料/Square' },
    {
      keywords: ['ホットペッパー', 'hotpepper', 'リクルート'],
      docType: 'ホットペッパービューティー関係書類',
      folder: '05_売上資料/ホットペッパー',
    },
    {
      keywords: ['楽天', 'rakuten'],
      docType: '楽天ビューティー関係書類',
      folder: '05_売上資料/楽天ビューティー',
    },
    { keywords: ['税務署', '国税'], docType: '税務書類', folder: '07_税務・行政/税務署' },
    { keywords: ['年金'], docType: '社会保険関係書類', folder: '07_税務・行政/年金事務所' },
    {
      keywords: ['明細', 'カードご利用', '取引明細'],
      docType: '銀行明細',
      folder: '04_銀行・カード明細',
    },
  ];
  for (const rule of rules) {
    if (rule.keywords.some((k) => src.includes(k.toLowerCase()))) {
      return { docType: rule.docType, folder: rule.folder };
    }
  }
  return { docType: 'その他', folder: '00_未分類・新規受付' };
}

const MAX_FILES_PER_RUN = 20;

/** 未分類フォルダのファイルを解析して分類提案を作成する。戻り値: 提案数 */
export function proposeFileClassifications(): number {
  ensureSheet('FILE_CLASSIFY');
  const root = ensureRootFolder();
  const it = root.getFoldersByName('00_未分類・新規受付');
  if (!it.hasNext()) {
    logger.warn(
      'proposeFileClassifications',
      '00_未分類・新規受付 フォルダがありません。先に「Driveフォルダを作成」を実行してください。',
    );
    return 0;
  }
  const inbox = it.next();
  const known = new Set(
    readRecords('FILE_CLASSIFY').map((r) => String(r.record['ファイルURL'] ?? '').trim()),
  );
  const ocrEnabled = getIntegrationConfig().visionApiKey !== '';

  let proposed = 0;
  const files = inbox.getFiles();
  while (files.hasNext() && proposed < MAX_FILES_PER_RUN) {
    const file = files.next();
    const url = file.getUrl();
    if (known.has(url)) continue; // 既に提案済み(冪等)

    let guess: ReceiptGuess = { date: '', amount: '', vendor: '', excerpt: '' };
    let ocrNote = '';
    if (ocrEnabled && isOcrTarget(file.getMimeType())) {
      try {
        guess = parseReceiptText(ocrImageFile(file));
      } catch (e) {
        ocrNote = `OCR失敗: ${errorMessage(e).slice(0, 100)}`;
      }
    } else if (!ocrEnabled) {
      ocrNote = 'OCR未設定(VISION_API_KEY)のためファイル名のみで推定';
    }

    const cls = suggestClassification(file.getName(), guess.excerpt);
    const proposedName = buildFileName({
      date: guess.date || formatDate(new Date(file.getDateCreated().getTime())),
      entity: '',
      vendor: guess.vendor,
      docType: cls.docType,
      amount: guess.amount,
      manageId: '',
      extension: file.getName().includes('.') ? file.getName().split('.').pop() : '',
    });

    const rowNumber = appendRecord('FILE_CLASSIFY', {
      ファイル名: file.getName(),
      ファイルURL: url,
      推定書類種別: cls.docType,
      提案フォルダ: cls.folder,
      提案ファイル名: proposedName,
      推定日付: guess.date,
      推定金額: guess.amount,
      推定取引先: guess.vendor,
      OCR抜粋: guess.excerpt,
      ステータス: '提案中',
      登録日時: formatDateTime(new Date()),
      備考: ocrNote,
    });
    assignIdToRow('FILE_CLASSIFY', rowNumber);
    proposed++;
  }
  logger.info(
    'proposeFileClassifications',
    `分類提案を ${proposed} 件作成しました(移動はしていません)`,
  );
  return proposed;
}

/**
 * ステータスが「承認」の提案だけを実行する(フォルダへ移動+提案ファイル名へ改名)。
 * 戻り値: 実行件数
 */
export function applyApprovedClassifications(): number {
  const sheet = ensureSheet('FILE_CLASSIFY');
  const rows = readRecords('FILE_CLASSIFY');
  const statusCol = colOf(sheet, 'ステータス');
  const executedCol = colOf(sheet, '実行日時');
  const errorCol = colOf(sheet, 'エラー');
  const root = ensureRootFolder();

  // 相対パス → フォルダ解決(存在しない場合は作成しない=提案の誤りに気付ける)
  const resolveFolder = (path: string): GoogleAppsScript.Drive.Folder | null => {
    let current = root;
    for (const part of path.split('/').filter((p) => p.trim() !== '')) {
      const it = current.getFoldersByName(part.trim());
      if (!it.hasNext()) return null;
      current = it.next();
    }
    return current;
  };

  let applied = 0;
  for (const { rowNumber, record } of rows) {
    if (String(record['ステータス'] ?? '').trim() !== '承認') continue;
    try {
      const url = String(record['ファイルURL'] ?? '');
      const idMatch = url.match(/[-\w]{25,}/);
      if (!idMatch) throw new Error('ファイルURLからIDを特定できません');
      const file = DriveApp.getFileById(idMatch[0]);
      const folderPath = String(record['提案フォルダ'] ?? '').trim();
      const target = resolveFolder(folderPath);
      if (!target) {
        throw new Error(
          `フォルダ「${folderPath}」が見つかりません。「Driveフォルダを作成」を実行するかパスを修正してください`,
        );
      }
      const newName = String(record['提案ファイル名'] ?? '').trim();
      if (!isBlank(newName)) file.setName(newName);
      file.moveTo(target);
      sheet.getRange(rowNumber, statusCol).setValue('実行済み');
      sheet.getRange(rowNumber, executedCol).setValue(formatDateTime(new Date()));
      sheet.getRange(rowNumber, errorCol).setValue('');
      applied++;
    } catch (e) {
      sheet.getRange(rowNumber, statusCol).setValue('エラー');
      sheet.getRange(rowNumber, errorCol).setValue(errorMessage(e).slice(0, 300));
      logger.error('applyApprovedClassifications', `分類実行に失敗(行${rowNumber})`, e);
    }
  }
  logger.info('applyApprovedClassifications', `承認済みの分類を ${applied} 件実行しました`);
  return applied;
}
