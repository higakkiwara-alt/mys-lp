/**
 * onFormSubmit ハンドラー
 * フォーム回答を 02_書類受付台帳 へ整形して登録する。
 * 回答自体はフォームの回答シート(中間シート)にも残る(原本データ保護)。
 */
import { formatDateTime } from '../utils/helpers';
import { errorMessage } from '../utils/errors';
import { logger } from '../utils/logger';
import { mapFormAnswerToIntake } from '../services/formService';
import { assignIdToRow } from '../services/idService';
import { appendRecord } from '../services/sheetService';

export function handleFormSubmitEvent(e: GoogleAppsScript.Events.SheetsOnFormSubmit): void {
  try {
    const named = (e.namedValues ?? {}) as Record<string, string[]>;
    const record = mapFormAnswerToIntake(named);
    record['登録日時'] = formatDateTime(new Date());
    const rowNumber = appendRecord('INTAKE', record);
    const id = assignIdToRow('INTAKE', rowNumber);
    logger.info('handleFormSubmit', `フォーム回答を台帳へ登録しました: ${id}`, {
      manageId: id,
    });
  } catch (err) {
    logger.error('handleFormSubmit', `フォーム取込でエラー: ${errorMessage(err)}`, err);
  }
}
