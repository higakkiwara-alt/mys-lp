/**
 * ダッシュボードサービス(01_経理ダッシュボード)
 * 集計は基本的にシート数式(COUNTIFS/QUERY等)で行い、スクリプトはレイアウト構築と
 * 更新日時の記録のみを担当する(数式なら常に最新値が表示されるため)。
 */
import { COLORS, OPEN_STATUSES, SHEETS } from '../constants';
import { getConfig } from '../config';
import { formatDateTime } from '../utils/helpers';
import { logger } from '../utils/logger';
import { colLetterOf, ensureSheet, findSheet } from './sheetService';

/** 未完了ステータスの QUERY matches 用正規表現 */
export function openStatusRegex(): string {
  return OPEN_STATUSES.join('|');
}

/** 純関数: 件数集計(テスト用。数式と同じ定義でカウントする) */
export function countOpen(records: Array<Record<string, unknown>>, statusHeader: string): number {
  return records.filter((r) => OPEN_STATUSES.includes(String(r[statusHeader] ?? '').trim())).length;
}

function q(sheetName: string, clause: string): string {
  return `IFERROR(QUERY('${sheetName}'!A2:AZ, "${clause}", 0), "該当なし")`;
}

/** ダッシュボードを構築する(全体を書き直す。ユーザーデータは無いので安全) */
export function rebuildDashboard(): void {
  const sheet = ensureSheet('DASHBOARD');
  const cfg = getConfig();

  // 参照先の列文字を実シートから解決する(列がずれても正しい数式になる)
  const intake = findSheet('INTAKE');
  const receipt = findSheet('RECEIPT');
  const invoice = findSheet('INVOICE');
  const contract = findSheet('CONTRACT');
  const question = findSheet('QUESTION');
  const monthly = findSheet('MONTHLY_CLOSE');
  const errors = findSheet('ERROR_LIST');
  if (!intake || !receipt || !invoice || !contract || !question || !monthly || !errors) {
    throw new Error('必要なシートが不足しています。先に「初期セットアップ」を実行してください。');
  }
  const iN = SHEETS.INTAKE.name;
  const rN = SHEETS.RECEIPT.name;
  const vN = SHEETS.INVOICE.name;
  const cN = SHEETS.CONTRACT.name;
  const qN = SHEETS.QUESTION.name;
  const mN = SHEETS.MONTHLY_CLOSE.name;
  const eN = SHEETS.ERROR_LIST.name;

  const c = {
    iId: colLetterOf(intake, '管理ID'),
    iRecv: colLetterOf(intake, '受付日'),
    iPayDue: colLetterOf(intake, '支払期限'),
    iDue: colLetterOf(intake, '対応期限'),
    iStore: colLetterOf(intake, '対象店舗'),
    iType: colLetterOf(intake, '書類種別'),
    iName: colLetterOf(intake, '書類名・内容'),
    iAssignee: colLetterOf(intake, '処理担当者'),
    iStatus: colLetterOf(intake, '現在のステータス'),
    iSev: colLetterOf(intake, '重要度'),
    iDone: colLetterOf(intake, '完了日'),
    rSaved: colLetterOf(receipt, '原本保存状況'),
    rEntry: colLetterOf(receipt, '会計ソフト入力状況'),
    rAmount: colLetterOf(receipt, '金額'),
    vId: colLetterOf(invoice, '管理ID'),
    vVendor: colLetterOf(invoice, '取引先'),
    vAmount: colLetterOf(invoice, '請求金額'),
    vDue: colLetterOf(invoice, '支払期限'),
    vPay: colLetterOf(invoice, '支払状況'),
    vEntry: colLetterOf(invoice, '会計ソフト入力状況'),
    cId: colLetterOf(contract, '管理ID'),
    cName2: colLetterOf(contract, '契約・書類名'),
    cEnd: colLetterOf(contract, '契約終了日'),
    cCancel: colLetterOf(contract, '解約通知期限'),
    qId: colLetterOf(question, '質問ID'),
    qText: colLetterOf(question, '質問内容'),
    qRule: colLetterOf(question, 'ルール化の要否'),
    qReflect: colLetterOf(question, '書類処理ルールへの反映状況'),
    qAnswer: colLetterOf(question, '回答内容'),
    mYm: colLetterOf(monthly, '対象年月'),
    mState: colLetterOf(monthly, '実施状況'),
    eType: colLetterOf(errors, '不整合種別'),
    eState: colLetterOf(errors, '対応状況'),
  };

  const openRegex = openStatusRegex();
  const monthStart = 'DATE(YEAR(TODAY()),MONTH(TODAY()),1)';
  const openCount = (sheetName: string, statusCol: string): string =>
    `SUMPRODUCT(COUNTIFS('${sheetName}'!${statusCol}2:${statusCol}, {"${OPEN_STATUSES.join('";"')}"}))`;
  const openIssueCount = (type: string): string =>
    `COUNTIFS('${eN}'!${c.eType}2:${c.eType},"${type}",'${eN}'!${c.eState}2:${c.eState},"<>解消済み",'${eN}'!${c.eState}2:${c.eState},"<>対応済み",'${eN}'!${c.eState}2:${c.eState},"<>対象外")`;

  sheet.clear();
  sheet.clearFormats();

  const setLabelValue = (row: number, labelCol: number, label: string, formula: string): void => {
    sheet.getRange(row, labelCol).setValue(label);
    sheet.getRange(row, labelCol + 1).setFormula('=' + formula);
  };

  // タイトル
  sheet.getRange('A1').setValue(`${cfg.companyName} 経理ダッシュボード`);
  sheet
    .getRange('A1:I1')
    .merge()
    .setBackground(COLORS.dashboardTitle)
    .setFontColor('#ffffff')
    .setFontSize(14)
    .setFontWeight('bold');
  sheet.getRange('A2').setValue('最終更新');
  sheet.getRange('B2').setValue(formatDateTime(new Date()));
  sheet
    .getRange('D2')
    .setValue(cfg.mode === 'production' ? '本番モード' : 'テストモード(通知は設定で有効化)');

  const section = (row: number, title: string): void => {
    sheet.getRange(row, 1).setValue(title);
    sheet.getRange(row, 1, 1, 9).setBackground(COLORS.sectionBg).setFontWeight('bold');
  };

  // ===== 今月のサマリー =====
  section(4, '■ 今月のサマリー');
  setLabelValue(
    5,
    1,
    '今月の登録書類数',
    `COUNTIFS('${iN}'!${c.iRecv}2:${c.iRecv},">="&${monthStart})`,
  );
  setLabelValue(
    5,
    4,
    '今月の処理完了件数',
    `COUNTIFS('${iN}'!${c.iDone}2:${c.iDone},">="&${monthStart})`,
  );
  setLabelValue(6, 1, '未処理件数(台帳)', openCount(iN, c.iStatus));
  setLabelValue(6, 4, '期限超過件数', openIssueCount('期限超過'));
  setLabelValue(
    7,
    1,
    '代表確認待ち件数',
    `COUNTIF('${iN}'!${c.iStatus}2:${c.iStatus},"代表確認待ち")`,
  );
  setLabelValue(
    7,
    4,
    '税理士確認待ち件数',
    `COUNTIF('${iN}'!${c.iStatus}2:${c.iStatus},"税理士確認待ち")`,
  );
  setLabelValue(
    8,
    1,
    '社労士確認待ち件数',
    `COUNTIF('${iN}'!${c.iStatus}2:${c.iStatus},"社労士確認待ち")`,
  );
  setLabelValue(8, 4, '原本未保存件数', `COUNTIF('${rN}'!${c.rSaved}2:${c.rSaved},"未保存")`);
  setLabelValue(9, 1, '金額未入力件数', openIssueCount('金額が未入力'));
  setLabelValue(
    9,
    4,
    '会計ソフト未入力件数',
    `COUNTIF('${rN}'!${c.rEntry}2:${c.rEntry},"未入力")+COUNTIF('${vN}'!${c.vEntry}2:${c.vEntry},"未入力")`,
  );
  setLabelValue(
    10,
    1,
    '今月の月次締め進捗率',
    `IFERROR(ROUND(COUNTIFS('${mN}'!${c.mYm}2:${c.mYm},TEXT(TODAY(),"yyyy-MM"),'${mN}'!${c.mState}2:${c.mState},"完了")/COUNTIFS('${mN}'!${c.mYm}2:${c.mYm},TEXT(TODAY(),"yyyy-MM"))*100,0)&"%","未生成")`,
  );
  setLabelValue(
    10,
    4,
    'データ不整合件数(未対応)',
    `COUNTIF('${eN}'!${c.eState}2:${c.eState},"未対応")+COUNTIF('${eN}'!${c.eState}2:${c.eState},"対応中")`,
  );

  // ===== 期限・緊急 =====
  section(12, '■ 期限・緊急(上位20件)');
  sheet.getRange('A13').setValue('▼ 直近7日以内の期限一覧(書類受付台帳)');
  sheet
    .getRange('A14')
    .setFormula(
      '=' +
        q(
          iN,
          `select ${c.iId}, ${c.iName}, ${c.iDue}, ${c.iPayDue}, ${c.iAssignee} ` +
            `where ${c.iStatus} matches '${openRegex}' ` +
            `and ((${c.iDue} >= toDate(now()) and ${c.iDue} <= toDate(now()+7)) ` +
            `or (${c.iPayDue} >= toDate(now()) and ${c.iPayDue} <= toDate(now()+7))) ` +
            `order by ${c.iDue}, ${c.iPayDue} limit 20 ` +
            `label ${c.iId} '管理ID', ${c.iName} '内容', ${c.iDue} '対応期限', ${c.iPayDue} '支払期限', ${c.iAssignee} '担当者'`,
        ),
    );

  sheet.getRange('A22').setValue('▼ 重要度「緊急」の未完了案件');
  sheet
    .getRange('A23')
    .setFormula(
      '=' +
        q(
          iN,
          `select ${c.iId}, ${c.iName}, ${c.iDue}, ${c.iAssignee} ` +
            `where ${c.iSev} = '緊急' and ${c.iStatus} matches '${openRegex}' limit 20 ` +
            `label ${c.iId} '管理ID', ${c.iName} '内容', ${c.iDue} '対応期限', ${c.iAssignee} '担当者'`,
        ),
    );

  sheet.getRange('A31').setValue('▼ 支払期限3日以内・未払いの請求書');
  sheet
    .getRange('A32')
    .setFormula(
      '=' +
        q(
          vN,
          `select ${c.vId}, ${c.vVendor}, ${c.vAmount}, ${c.vDue} ` +
            `where ${c.vDue} <= toDate(now()+3) and ${c.vPay} matches '未払い|支払予定|支払処理中' ` +
            `order by ${c.vDue} limit 20 ` +
            `label ${c.vId} '管理ID', ${c.vVendor} '取引先', ${c.vAmount} '金額', ${c.vDue} '支払期限'`,
        ),
    );

  sheet.getRange('A40').setValue(`▼ 契約更新・解約通知期限一覧(${cfg.contractWarnDays}日以内)`);
  sheet
    .getRange('A41')
    .setFormula(
      '=' +
        q(
          cN,
          `select ${c.cId}, ${c.cName2}, ${c.cCancel}, ${c.cEnd} ` +
            `where (${c.cCancel} <= toDate(now()+${cfg.contractWarnDays}) and ${c.cCancel} is not null) ` +
            `or (${c.cEnd} <= toDate(now()+${cfg.contractWarnDays}) and ${c.cEnd} is not null) ` +
            `order by ${c.cCancel} limit 20 ` +
            `label ${c.cId} '管理ID', ${c.cName2} '契約・書類名', ${c.cCancel} '解約通知期限', ${c.cEnd} '契約終了日'`,
        ),
    );

  // ===== 内訳 =====
  section(50, '■ 内訳');
  sheet.getRange('A51').setValue('▼ 店舗別未処理件数');
  sheet
    .getRange('A52')
    .setFormula(
      '=' +
        q(
          iN,
          `select ${c.iStore}, count(${c.iId}) where ${c.iStatus} matches '${openRegex}' ` +
            `group by ${c.iStore} label ${c.iStore} '店舗', count(${c.iId}) '未処理件数'`,
        ),
    );
  sheet.getRange('D51').setValue('▼ 書類種別別件数(未完了)');
  sheet
    .getRange('D52')
    .setFormula(
      '=' +
        q(
          iN,
          `select ${c.iType}, count(${c.iId}) where ${c.iStatus} matches '${openRegex}' ` +
            `group by ${c.iType} label ${c.iType} '書類種別', count(${c.iId}) '件数'`,
        ),
    );
  sheet.getRange('G51').setValue('▼ 担当者別未処理件数');
  sheet
    .getRange('G52')
    .setFormula(
      '=' +
        q(
          iN,
          `select ${c.iAssignee}, count(${c.iId}) where ${c.iStatus} matches '${openRegex}' ` +
            `group by ${c.iAssignee} label ${c.iAssignee} '担当者', count(${c.iId}) '未処理件数'`,
        ),
    );

  // ===== ルール化待ちの質問 =====
  section(70, '■ 回答済み・ルール化待ちの質問');
  sheet
    .getRange('A71')
    .setFormula(
      '=' +
        q(
          qN,
          `select ${c.qId}, ${c.qText}, ${c.qReflect} ` +
            `where ${c.qRule} = '要' and ${c.qAnswer} is not null and ${c.qReflect} != '反映済み' limit 20 ` +
            `label ${c.qId} '質問ID', ${c.qText} '質問内容', ${c.qReflect} '反映状況'`,
        ),
    );

  // 書式
  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 260);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 180);
  sheet.setColumnWidth(5, 260);
  sheet.setColumnWidth(6, 110);
  sheet.setColumnWidth(7, 160);
  sheet.setColumnWidth(8, 120);
  sheet.setColumnWidth(9, 120);
  sheet.getRange('B5:B10').setFontWeight('bold').setFontSize(12);
  sheet.getRange('E5:E10').setFontWeight('bold').setFontSize(12);
  if (sheet.getFrozenRows() < 2) sheet.setFrozenRows(2);

  logger.info('rebuildDashboard', 'ダッシュボードを再構築しました');
}

/** ダッシュボードの更新(数式は自動計算のため、更新日時のみ書き換える) */
export function updateDashboard(): void {
  const sheet = ensureSheet('DASHBOARD');
  if (String(sheet.getRange('A2').getValue()) !== '最終更新') {
    rebuildDashboard();
    return;
  }
  sheet.getRange('B2').setValue(formatDateTime(new Date()));
  SpreadsheetApp.flush();
}
