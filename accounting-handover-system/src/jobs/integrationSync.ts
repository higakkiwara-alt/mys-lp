/**
 * 外部連携の日次同期ジョブ
 * 設定済みの連携のみ実行し、未設定はスキップする(エラーにしない)。
 * - Gmail 請求書取込(GMAIL_IMPORT_ENABLED=true のとき)
 * - Square 売上取得(SQUARE_ACCESS_TOKEN 設定時、直近7日)
 * - 明細CSV取込(取込待ちフォルダにファイルがあるとき)
 * - ファイル分類の「提案」作成(実行=移動は人間の承認後のみ)
 */
import { getIntegrationConfig } from '../config';
import { errorMessage } from '../utils/errors';
import { logger } from '../utils/logger';
import { importInvoicesFromGmail } from '../services/gmailService';
import { fetchSquareSales } from '../services/squareService';
import { importStatementsFromDrive } from '../services/statementImportService';
import { proposeFileClassifications } from '../services/driveClassifyService';

export function runIntegrationSync(): void {
  const ic = getIntegrationConfig();
  const step = (name: string, enabled: boolean, fn: () => void): void => {
    if (!enabled) {
      logger.info('runIntegrationSync', `${name}: 未設定のためスキップ`);
      return;
    }
    try {
      fn();
    } catch (e) {
      // 1連携の失敗で他を止めない
      logger.error('runIntegrationSync', `${name} でエラー: ${errorMessage(e)}`, e);
    }
  };

  step('Gmail請求書取込', ic.gmailImportEnabled, () => importInvoicesFromGmail());
  step('Square売上取得', ic.squareAccessToken !== '', () => fetchSquareSales(7));
  step('明細CSV取込', true, () => importStatementsFromDrive());
  step('ファイル分類提案', true, () => proposeFileClassifications());
  logger.info('runIntegrationSync', '外部連携の日次同期が完了しました');
}
