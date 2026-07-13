/**
 * 条件付き書式の設定
 * 各シートのルールを毎回組み立て直して setConditionalFormatRules で置き換える
 * (置き換えなので何度実行しても重複しない = 冪等)。
 */
import { COLORS } from '../constants';
import { logger } from '../utils/logger';
import { colLetterOf, findSheet } from '../services/sheetService';

type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
type Rule = GoogleAppsScript.Spreadsheet.ConditionalFormatRule;

const ROWS = 1000;

function fullRange(sheet: Sheet): GoogleAppsScript.Spreadsheet.Range {
  return sheet.getRange(2, 1, ROWS, Math.max(sheet.getLastColumn(), 1));
}

function formulaRule(sheet: Sheet, formula: string, background: string): Rule {
  return SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(formula)
    .setBackground(background)
    .setRanges([fullRange(sheet)])
    .build();
}

export function setupConditionalFormatting(): void {
  // 02_書類受付台帳
  const intake = findSheet('INTAKE');
  if (intake) {
    const st = colLetterOf(intake, '現在のステータス');
    const due = colLetterOf(intake, '対応期限');
    const payDue = colLetterOf(intake, '支払期限');
    const sev = colLetterOf(intake, '重要度');
    const openCond = `$${st}2<>"処理済み",$${st}2<>"対応不要",$${st}2<>""`;
    intake.setConditionalFormatRules([
      // 期限超過(未完了)
      formulaRule(
        intake,
        `=AND(${openCond},OR(AND($${due}2<>"",$${due}2<TODAY()),AND($${payDue}2<>"",$${payDue}2<TODAY())))`,
        COLORS.danger,
      ),
      // 重要度: 緊急
      formulaRule(intake, `=AND($${sev}2="緊急",${openCond})`, COLORS.warning),
    ]);
  }

  // 03_レシート・領収書管理
  const receipt = findSheet('RECEIPT');
  if (receipt) {
    const dup = colLetterOf(receipt, '重複候補');
    const saved = colLetterOf(receipt, '原本保存状況');
    receipt.setConditionalFormatRules([
      formulaRule(receipt, `=$${dup}2=TRUE`, COLORS.danger),
      formulaRule(receipt, `=$${saved}2="未保存"`, COLORS.warning),
    ]);
  }

  // 04_請求書・支払管理
  const invoice = findSheet('INVOICE');
  if (invoice) {
    const pay = colLetterOf(invoice, '支払状況');
    const due = colLetterOf(invoice, '支払期限');
    const plan = colLetterOf(invoice, '支払予定日');
    const approve = colLetterOf(invoice, '代表承認');
    const doneDate = colLetterOf(invoice, '支払完了日');
    const proof = colLetterOf(invoice, '支払証明リンク');
    const unpaid = `OR($${pay}2="未払い",$${pay}2="支払予定",$${pay}2="支払処理中",$${pay}2="")`;
    invoice.setConditionalFormatRules([
      // 支払期限超過かつ未払い: 強い警告
      formulaRule(invoice, `=AND(${unpaid},$${due}2<>"",$${due}2<TODAY())`, COLORS.danger),
      // 支払期限3日前以内かつ未払い: 注意
      formulaRule(
        invoice,
        `=AND(${unpaid},$${due}2<>"",$${due}2>=TODAY(),$${due}2<=TODAY()+3)`,
        COLORS.warning,
      ),
      // 代表未承認かつ支払予定日接近: 注意
      formulaRule(
        invoice,
        `=AND($${approve}2="未承認",$${plan}2<>"",$${plan}2<=TODAY()+3)`,
        COLORS.warning,
      ),
      // 支払済みなのに支払完了日なし / 支払証明リンクなし: 警告
      formulaRule(
        invoice,
        `=AND($${pay}2="支払済み",OR($${doneDate}2="",$${proof}2=""))`,
        COLORS.warning,
      ),
    ]);
  }

  // 05_契約書・重要書類管理
  const contract = findSheet('CONTRACT');
  if (contract) {
    const end = colLetterOf(contract, '契約終了日');
    const cancel = colLetterOf(contract, '解約通知期限');
    const check = colLetterOf(contract, '更新確認日');
    const st = colLetterOf(contract, 'ステータス');
    const active = `$${st}2<>"処理済み",$${st}2<>"対応不要"`;
    const near = (col: string): string => `AND($${col}2<>"",$${col}2<=TODAY()+30)`;
    const past = (col: string): string => `AND($${col}2<>"",$${col}2<TODAY())`;
    contract.setConditionalFormatRules([
      formulaRule(
        contract,
        `=AND(${active},OR(${past(cancel)},${past(end)},${past(check)}))`,
        COLORS.danger,
      ),
      formulaRule(
        contract,
        `=AND(${active},OR(${near(cancel)},${near(end)},${near(check)}))`,
        COLORS.warning,
      ),
    ]);
  }

  // 08_月次締めチェックリスト
  const monthly = findSheet('MONTHLY_CLOSE');
  if (monthly) {
    const due = colLetterOf(monthly, '期限');
    const st = colLetterOf(monthly, '実施状況');
    monthly.setConditionalFormatRules([
      formulaRule(
        monthly,
        `=AND($${st}2<>"完了",$${st}2<>"対象外",$${due}2<>"",$${due}2<TODAY())`,
        COLORS.danger,
      ),
      formulaRule(monthly, `=$${st}2="完了"`, COLORS.ok),
    ]);
  }

  // 16_エラー・不整合一覧
  const errors = findSheet('ERROR_LIST');
  if (errors) {
    const sev = colLetterOf(errors, '重要度');
    const st = colLetterOf(errors, '対応状況');
    const open = `$${st}2<>"解消済み",$${st}2<>"対応済み",$${st}2<>"対象外"`;
    errors.setConditionalFormatRules([
      formulaRule(errors, `=AND($${sev}2="緊急",${open})`, COLORS.danger),
      formulaRule(errors, `=AND($${sev}2="高",${open})`, COLORS.warning),
    ]);
  }

  logger.info('setupConditionalFormatting', '条件付き書式を設定しました');
}
