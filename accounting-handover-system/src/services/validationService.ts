/**
 * データ不整合検出サービス(純関数)
 * シートから読み取った行データを受け取り、不整合の一覧を返す。
 * GAS API に依存しないため Vitest で単体テストできる。
 */
import {
  ENTRY_STATUS,
  OPEN_STATUSES,
  PAY_STATUS,
  SHEETS,
  STATUS,
  COMPANY_WIDE,
} from '../constants';
import type { IntegrityIssue, RowRecord } from '../types';
import { daysBetween, isBlank, toDate } from '../utils/helpers';

export interface IntegrityInput {
  intake: RowRecord[];
  receipts: RowRecord[];
  invoices: RowRecord[];
  contracts: RowRecord[];
  questions: RowRecord[];
  monthlyClose: RowRecord[];
  storeNames: string[];
  staffNames: string[];
  today: Date;
  /** 期限接近の警告日数 */
  warnDays: number;
  /** 契約更新の警告日数 */
  contractWarnDays: number;
}

/** 不整合の一意キー(重複登録防止に使う) */
export function issueKey(i: Pick<IntegrityIssue, 'type' | 'sheetName' | 'manageId'>): string {
  return `${i.type}|${i.sheetName}|${i.manageId}`;
}

function s(v: unknown): string {
  return String(v ?? '').trim();
}

function isTrue(v: unknown): boolean {
  return v === true || String(v).toUpperCase() === 'TRUE';
}

function isOpen(status: string): boolean {
  return status === '' || OPEN_STATUSES.includes(status);
}

/** すべての不整合を検出する */
export function detectIssues(input: IntegrityInput): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const add = (
    type: string,
    severity: IntegrityIssue['severity'],
    sheetName: string,
    manageId: string,
    problem: string,
    fix: string,
  ): void => {
    issues.push({ type, severity, sheetName, manageId, problem, fix });
  };

  const intakeName = SHEETS.INTAKE.name;
  const receiptName = SHEETS.RECEIPT.name;
  const invoiceName = SHEETS.INVOICE.name;
  const contractName = SHEETS.CONTRACT.name;
  const questionName = SHEETS.QUESTION.name;

  // --- 管理ID重複(全シート) ---
  const dupCheck = (rows: RowRecord[], idHeader: string, sheetName: string): void => {
    const seen = new Map<string, number>();
    for (const r of rows) {
      const id = s(r[idHeader]);
      if (!id) continue;
      seen.set(id, (seen.get(id) ?? 0) + 1);
    }
    for (const [id, count] of seen) {
      if (count > 1) {
        add(
          '管理ID重複',
          '高',
          sheetName,
          id,
          `管理ID ${id} が ${count} 行に存在します`,
          '重複行を確認し、正しい行以外のIDを振り直してください',
        );
      }
    }
  };
  dupCheck(input.intake, '管理ID', intakeName);
  dupCheck(input.receipts, '管理ID', receiptName);
  dupCheck(input.invoices, '管理ID', invoiceName);
  dupCheck(input.contracts, '管理ID', contractName);
  dupCheck(input.questions, '質問ID', questionName);

  const storeSet = new Set([...input.storeNames, COMPANY_WIDE]);
  const staffSet = new Set(input.staffNames);

  const checkStore = (r: RowRecord, id: string, sheetName: string): void => {
    const store = s(r['対象店舗']);
    if (store && !storeSet.has(store)) {
      add(
        'マスターに存在しない店舗名',
        '中',
        sheetName,
        id,
        `店舗「${store}」が11_店舗・事業マスターにありません`,
        '店舗マスターへ追加するか、正しい店舗名へ修正してください',
      );
    }
  };
  const checkStaff = (r: RowRecord, header: string, id: string, sheetName: string): void => {
    const name = s(r[header]);
    if (name && !staffSet.has(name)) {
      add(
        'マスターに存在しない担当者名',
        '低',
        sheetName,
        id,
        `${header}「${name}」が12_担当者マスターにありません`,
        '担当者マスターへ追加するか、正しい氏名へ修正してください',
      );
    }
  };

  // --- 02_書類受付台帳 ---
  for (const r of input.intake) {
    const id = s(r['管理ID']);
    const status = s(r['現在のステータス']);
    if (status === STATUS.DONE) {
      if (isBlank(r['完了日'])) {
        add(
          '処理済みなのに完了日がない',
          '中',
          intakeName,
          id,
          'ステータスが処理済みですが完了日が空欄です',
          '完了日を入力してください',
        );
      }
      if (isBlank(r['Google Driveリンク']) && isBlank(r['原本保管場所'])) {
        add(
          '処理済みなのに原本リンクがない',
          '中',
          intakeName,
          id,
          '処理済みですがGoogle Driveリンクも原本保管場所も空欄です',
          '原本の保存先を記録してください',
        );
      }
    }
    if (isOpen(status)) {
      if (isBlank(r['金額']) && status !== STATUS.UNCONFIRMED) {
        add(
          '金額が未入力',
          '中',
          intakeName,
          id,
          `「${s(r['書類名・内容'])}」の金額が未入力です`,
          '金額を入力してください(金額のない書類は0を入力)',
        );
      }
      if (isBlank(r['対象店舗'])) {
        add(
          '店舗が未入力',
          '中',
          intakeName,
          id,
          '対象店舗が未入力です',
          '対象店舗を選択してください',
        );
      }
      if (isBlank(r['書類種別'])) {
        add(
          '書類種別が未入力',
          '中',
          intakeName,
          id,
          '書類種別が未入力です',
          '書類種別を選択してください',
        );
      }
      const due = toDate(r['対応期限']) ?? toDate(r['支払期限']);
      if (due && daysBetween(due, input.today) > 0) {
        add(
          '期限超過',
          '緊急',
          intakeName,
          id,
          `期限(${s(r['対応期限']) || s(r['支払期限'])})を過ぎています: ${s(r['書類名・内容'])}`,
          '至急対応し、ステータスを更新してください',
        );
      }
      if (isTrue(r['税理士確認必要']) && status !== STATUS.WAIT_TAX) {
        add(
          '税理士確認必要なのに確認ステータスがない',
          '中',
          intakeName,
          id,
          '税理士確認必要ですがステータスが「税理士確認待ち」ではありません',
          'ステータスを税理士確認待ちにするか、確認済みならフラグを外してください',
        );
      }
    }
    checkStore(r, id, intakeName);
    checkStaff(r, '処理担当者', id, intakeName);
  }

  // --- 03_レシート・領収書管理 ---
  for (const r of input.receipts) {
    const id = s(r['管理ID']);
    const status = s(r['ステータス']);
    if (s(r['原本保存状況']) === '未保存') {
      add(
        '原本未保存',
        '中',
        receiptName,
        id,
        `原本が未保存です: ${s(r['購入先'])} ${s(r['金額'])}円`,
        '原本を撮影・保存し、原本保存状況を更新してください',
      );
    }
    if (isOpen(status) && isBlank(r['金額'])) {
      add('金額が未入力', '中', receiptName, id, '金額が未入力です', '金額を入力してください');
    }
    if (
      s(r['会計ソフト入力状況']) === ENTRY_STATUS.TODO &&
      (status === STATUS.DONE || status === STATUS.WAIT_ENTRY)
    ) {
      add(
        '会計ソフト入力待ち',
        '中',
        receiptName,
        id,
        '会計ソフトへの入力が終わっていません',
        '会計ソフトへ入力し、入力状況を更新してください',
      );
    }
    checkStore(r, id, receiptName);
    checkStaff(r, '利用者', id, receiptName);
  }

  // --- 04_請求書・支払管理 ---
  for (const r of input.invoices) {
    const id = s(r['管理ID']);
    const payStatus = s(r['支払状況']);
    if (payStatus === PAY_STATUS.PAID) {
      if (isBlank(r['支払完了日'])) {
        add(
          '支払済みなのに支払完了日がない',
          '高',
          invoiceName,
          id,
          '支払済みですが支払完了日が空欄です',
          '支払完了日を入力してください',
        );
      }
      if (isBlank(r['支払証明リンク'])) {
        add(
          '支払済みなのに支払証明リンクがない',
          '中',
          invoiceName,
          id,
          '支払済みですが支払証明(振込明細等)のリンクがありません',
          '支払証明をDriveへ保存しリンクを貼ってください',
        );
      }
      if (s(r['会計ソフト入力状況']) === ENTRY_STATUS.TODO) {
        add(
          '会計ソフト入力待ち',
          '中',
          invoiceName,
          id,
          '支払済みですが会計ソフト未入力です',
          '会計ソフトへ入力し、入力状況を更新してください',
        );
      }
    } else if (payStatus !== PAY_STATUS.NA && payStatus !== PAY_STATUS.HOLD) {
      if (isBlank(r['請求金額'])) {
        add(
          '金額が未入力',
          '中',
          invoiceName,
          id,
          '請求金額が未入力です',
          '請求金額を入力してください',
        );
      }
      const due = toDate(r['支払期限']);
      if (due) {
        const over = daysBetween(due, input.today);
        if (over > 0) {
          add(
            '期限超過',
            '緊急',
            invoiceName,
            id,
            `支払期限(${s(r['支払期限'])})を過ぎた未払い請求があります: ${s(r['取引先'])} ${s(r['請求金額'])}円`,
            '至急支払いを行うか、取引先と支払時期を調整してください',
          );
        } else if (-over <= input.warnDays) {
          add(
            '支払期限接近',
            '高',
            invoiceName,
            id,
            `支払期限(${s(r['支払期限'])})が${input.warnDays}日以内です: ${s(r['取引先'])}`,
            '支払準備と承認を確認してください',
          );
        }
      }
    }
    checkStore(r, id, invoiceName);
    checkStaff(r, '担当者', id, invoiceName);
  }

  // --- 05_契約書・重要書類管理 ---
  for (const r of input.contracts) {
    const id = s(r['管理ID']);
    const status = s(r['ステータス']);
    if (status === STATUS.DONE || status === STATUS.NO_ACTION) continue;
    const checkNear = (header: string, label: string): void => {
      const d = toDate(r[header]);
      if (!d) return;
      const diff = daysBetween(input.today, d); // 期限までの残日数
      if (diff < 0) {
        add(
          '期限超過',
          '高',
          contractName,
          id,
          `${label}(${s(r[header])})を過ぎています: ${s(r['契約・書類名'])}`,
          '契約内容を確認し、更新・解約の対応を行ってください',
        );
      } else if (diff <= input.contractWarnDays) {
        add(
          '契約更新・解約期限接近',
          '高',
          contractName,
          id,
          `${label}(${s(r[header])})まで${diff}日です: ${s(r['契約・書類名'])}`,
          '更新・解約の方針を代表へ確認してください',
        );
      }
    };
    checkNear('解約通知期限', '解約通知期限');
    checkNear('契約終了日', '契約終了日');
    checkNear('更新確認日', '更新確認日');
    checkStore(r, id, contractName);
  }

  // --- 07_確認・質問管理 ---
  for (const r of input.questions) {
    const id = s(r['質問ID']);
    const answered = !isBlank(r['回答内容']);
    if (
      answered &&
      s(r['ルール化の要否']) === '要' &&
      s(r['書類処理ルールへの反映状況']) !== '反映済み' &&
      s(r['書類処理ルールへの反映状況']) !== '対象外'
    ) {
      add(
        '質問回答済みなのにルール未反映',
        '中',
        questionName,
        id,
        `回答済みの質問がルール化されていません: ${s(r['質問内容']).slice(0, 40)}`,
        '06_書類処理ルールへ反映し、反映状況を更新してください',
      );
    }
    const status = s(r['ステータス']);
    if (isOpen(status) && !answered) {
      const due = toDate(r['回答期限']);
      if (due && daysBetween(due, input.today) > 0) {
        add(
          '期限超過',
          '高',
          questionName,
          id,
          `回答期限(${s(r['回答期限'])})を過ぎた未回答の質問があります`,
          '確認先へ督促してください',
        );
      }
    }
    checkStore(r, id, questionName);
  }

  return issues;
}

/**
 * レシートの重複候補を検出する(純関数)。
 * 戻り値: 重複判定キー → 行番号一覧(2件以上のもののみ)
 */
export function findDuplicateReceipts(
  rows: Array<{ rowNumber: number; key: string }>,
): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const r of rows) {
    if (!r.key || r.key.split('|').every((p) => p === '')) continue;
    const list = map.get(r.key) ?? [];
    list.push(r.rowNumber);
    map.set(r.key, list);
  }
  const result = new Map<string, number[]>();
  for (const [key, list] of map) {
    if (list.length > 1) result.set(key, list);
  }
  return result;
}
