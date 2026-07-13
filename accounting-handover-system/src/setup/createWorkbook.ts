/**
 * 初期セットアップの統括
 * すべての処理は冪等(2回実行しても重複・データ消失なし)。
 * 一部が失敗しても続行し、最後に結果をまとめて報告する。
 */
import { errorMessage } from '../utils/errors';
import { logger } from '../utils/logger';
import { ensureAllSheets } from './createSheets';
import { setupHeaders } from './setupHeaders';
import { setupFormats } from './setupFormats';
import { setupValidations } from './setupValidations';
import { setupConditionalFormatting } from './setupConditionalFormatting';
import { setupFormulas } from './setupFormulas';
import { setupProtections } from './setupProtections';
import { seedSampleData } from './setupSampleData';
import { setupTriggers } from './setupTriggers';

export interface SetupResult {
  succeeded: string[];
  failed: Array<{ step: string; error: string }>;
}

export function runInitialSetup(): SetupResult {
  const steps: Array<[string, () => void]> = [
    ['シート作成', ensureAllSheets],
    ['初期データ・サンプル投入', seedSampleData],
    ['見出し書式', setupHeaders],
    ['表示形式', setupFormats],
    ['入力規則', setupValidations],
    ['条件付き書式', setupConditionalFormatting],
    ['数式・ダッシュボード', setupFormulas],
    ['保護', setupProtections],
    ['トリガー', setupTriggers],
  ];
  const result: SetupResult = { succeeded: [], failed: [] };
  for (const [name, fn] of steps) {
    try {
      fn();
      result.succeeded.push(name);
    } catch (e) {
      // 部分失敗しても最後まで進める(最重要ルール10)
      result.failed.push({ step: name, error: errorMessage(e) });
      logger.error('runInitialSetup', `ステップ「${name}」が失敗しました`, e);
    }
  }
  logger.info(
    'runInitialSetup',
    `初期セットアップ完了: 成功 ${result.succeeded.length} / 失敗 ${result.failed.length}`,
  );
  return result;
}

/** シート構成の修復(シート・列・見出しだけを直す軽量版) */
export function repairSheets(): void {
  ensureAllSheets();
  setupHeaders();
  setupFormats();
  logger.info('repairSheets', 'シート構成を修復しました');
}
