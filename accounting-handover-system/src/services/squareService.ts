/**
 * Square 売上自動取得サービス
 * Square Payments API から支払データを取得し、日付×店舗で集計して
 * 17_売上データ取込 へ書き込む(取込キーで冪等)。
 * - SQUARE_ACCESS_TOKEN(Script Properties)が必要
 * - 店舗名は 11_店舗・事業マスターの「Square店舗名」で変換
 * - 会計上の売上計上方法(総額/手数料控除後)は税理士確認必要(あくまで管理用の概算)
 */
import { getIntegrationConfig } from '../config';
import { ConfigError } from '../utils/errors';
import { formatDate, formatDateTime } from '../utils/helpers';
import { logger } from '../utils/logger';
import { ensureSheet, readRecords } from './sheetService';

export interface SquarePaymentLite {
  createdAt: string; // ISO日時
  locationId: string;
  amount: number; // JPYは最小単位=円
  fee: number;
}

export interface DailySales {
  date: string; // yyyy-MM-dd
  locationId: string;
  amount: number;
  fee: number;
  count: number;
}

/** 支払一覧を 日付×ロケーション で集計する(純関数・テスト対象) */
export function aggregateSquarePayments(payments: SquarePaymentLite[]): DailySales[] {
  const map = new Map<string, DailySales>();
  for (const p of payments) {
    const date = String(p.createdAt).slice(0, 10);
    const key = `${date}|${p.locationId}`;
    const cur = map.get(key) ?? { date, locationId: p.locationId, amount: 0, fee: 0, count: 0 };
    cur.amount += p.amount;
    cur.fee += p.fee;
    cur.count += 1;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) =>
    (a.date + a.locationId).localeCompare(b.date + b.locationId),
  );
}

function squareBaseUrl(env: string): string {
  return env === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com';
}

function squareFetch(path: string, token: string, env: string): any {
  const res = UrlFetchApp.fetch(`${squareBaseUrl(env)}${path}`, {
    method: 'get',
    headers: { Authorization: `Bearer ${token}`, 'Square-Version': '2024-01-18' },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) {
    throw new Error(
      `Square API エラー(${res.getResponseCode()}): ${res.getContentText().slice(0, 300)}`,
    );
  }
  return JSON.parse(res.getContentText());
}

/** ロケーションID → マスターの店舗名 の対応表を作る */
function buildLocationNameMap(token: string, env: string): Map<string, string> {
  const locations = squareFetch('/v2/locations', token, env)?.locations ?? [];
  const masterRows = readRecords('BUSINESS').map((r) => r.record);
  const bySquareName = new Map<string, string>();
  for (const rec of masterRows) {
    const sq = String(rec['Square店舗名'] ?? '').trim();
    const store = String(rec['店舗名'] ?? '').trim();
    if (sq && store) bySquareName.set(sq, store);
  }
  const map = new Map<string, string>();
  for (const loc of locations) {
    const name = String(loc.name ?? '');
    map.set(String(loc.id), bySquareName.get(name) ?? name);
  }
  return map;
}

/**
 * 指定期間の Square 売上を取得して 17_売上データ取込 へ反映する。
 * @returns 追加・更新した行数
 */
export function fetchSquareSales(days = 7): number {
  const ic = getIntegrationConfig();
  if (!ic.squareAccessToken) {
    throw new ConfigError(
      'Square連携には Script Properties の SQUARE_ACCESS_TOKEN の設定が必要です。docs/integration-guide.md を参照してください。',
    );
  }
  const token = ic.squareAccessToken;
  const env = ic.squareEnvironment;

  const end = new Date();
  const begin = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const beginIso = `${formatDate(begin)}T00:00:00+09:00`;

  // 支払を全ページ取得(最大10ページ=1000件/回で打ち切り、ログに記録)
  const payments: SquarePaymentLite[] = [];
  let cursor = '';
  for (let page = 0; page < 10; page++) {
    const q = `/v2/payments?begin_time=${encodeURIComponent(beginIso)}&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const body = squareFetch(q, token, env);
    for (const p of body.payments ?? []) {
      if (String(p.status) !== 'COMPLETED') continue;
      const fee = (p.processing_fee ?? []).reduce(
        (sum: number, f: any) => sum + Number(f?.amount_money?.amount ?? 0),
        0,
      );
      payments.push({
        createdAt: String(p.created_at ?? ''),
        locationId: String(p.location_id ?? ''),
        amount: Number(p.amount_money?.amount ?? 0),
        fee,
      });
    }
    cursor = String(body.cursor ?? '');
    if (!cursor) break;
    if (page === 9)
      logger.warn(
        'fetchSquareSales',
        '支払件数が多いため1000件で打ち切りました。期間を短くして再実行してください。',
      );
  }

  const daily = aggregateSquarePayments(payments);
  const locationNames = buildLocationNameMap(token, env);

  // 既存の取込キー → 行番号(冪等: 同キーは更新)
  const sheet = ensureSheet('SQUARE_SALES');
  const existing = new Map(
    readRecords('SQUARE_SALES').map((r) => [String(r.record['取込キー'] ?? ''), r.rowNumber]),
  );
  const lastCol = sheet.getLastColumn();

  let written = 0;
  const nowStr = formatDateTime(new Date());
  for (const d of daily) {
    const store = locationNames.get(d.locationId) ?? d.locationId;
    const key = `${d.date}|${store}|Square`;
    const rowValues = [
      key,
      d.date,
      store,
      d.amount,
      d.fee,
      d.amount - d.fee,
      d.count,
      'Square',
      nowStr,
      '',
    ];
    const rowNumber = existing.get(key);
    if (rowNumber) {
      sheet
        .getRange(rowNumber, 1, 1, Math.min(lastCol, rowValues.length))
        .setValues([rowValues.slice(0, lastCol)]);
    } else {
      sheet
        .getRange(sheet.getLastRow() + 1, 1, 1, Math.min(lastCol, rowValues.length))
        .setValues([rowValues.slice(0, lastCol)]);
    }
    written++;
  }
  logger.info(
    'fetchSquareSales',
    `Square売上を取得しました: 直近${days}日 / 支払${payments.length}件 → 日次${written}行(計上方法は税理士確認必要)`,
  );
  return written;
}
