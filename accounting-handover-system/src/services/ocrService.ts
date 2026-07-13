/**
 * レシートOCRサービス(Google Cloud Vision API)
 * 画像から文字を抽出し、日付・金額・購入先の候補を推定する。
 * - VISION_API_KEY(Script Properties)が未設定なら分かりやすいエラー
 * - OCR結果はあくまで「推定」。人間が確認して確定する(20_ファイル分類提案に書き込む)
 * - PDFのOCRは Vision の同期APIでは未対応のため対象外(制限事項)
 */
import { getIntegrationConfig } from '../config';
import { ConfigError } from '../utils/errors';

const OCR_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];

export interface ReceiptGuess {
  date: string; // yyyy-MM-dd または ''
  amount: number | '';
  vendor: string;
  excerpt: string;
}

/** OCRテキストから日付・金額・購入先を推定する(純関数・テスト対象) */
export function parseReceiptText(text: string): ReceiptGuess {
  const lines = String(text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '');

  // 日付: yyyy/mm/dd・yyyy-mm-dd・yyyy年mm月dd日 の最初の出現
  let date = '';
  const dateRe = /(\d{4})[年/\-.](\d{1,2})[月/\-.](\d{1,2})/;
  for (const line of lines) {
    const m = line.match(dateRe);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      if (y >= 2000 && y <= 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        date = `${m[1]}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        break;
      }
    }
  }

  // 金額: 「合計」「税込」を含む行を優先し、無ければ全行の最大金額
  const amountRe = /[¥￥]?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\s*円?/g;
  const amountsIn = (line: string): number[] => {
    // 日付・時刻・電話番号を金額として誤検出しないよう先に除去する
    const cleaned = line
      .replace(/\d{4}[年/\-.]\d{1,2}[月/\-.]?\d{0,2}日?/g, ' ')
      .replace(/\d{1,2}:\d{2}(:\d{2})?/g, ' ')
      .replace(/\d{2,4}-\d{2,4}-\d{3,4}/g, ' ');
    const out: number[] = [];
    let m: RegExpExecArray | null;
    const re = new RegExp(amountRe.source, 'g');
    while ((m = re.exec(cleaned)) !== null) {
      const n = Number(m[1].replace(/,/g, ''));
      // 電話番号・日付等の誤検出を減らすため 10円〜1000万円 に限定
      if (isFinite(n) && n >= 10 && n <= 10_000_000) out.push(n);
    }
    return out;
  };
  let amount: number | '' = '';
  const totalLines = lines.filter((l) => /(合計|合計金額|税込|お買上|ご請求)/.test(l));
  for (const l of totalLines) {
    const nums = amountsIn(l);
    if (nums.length > 0) {
      amount = Math.max(...nums);
      break;
    }
  }
  if (amount === '') {
    const all = lines.flatMap(amountsIn);
    if (all.length > 0) amount = Math.max(...all);
  }

  // 購入先: 先頭の「日付・金額・レシート定型語でない」行
  let vendor = '';
  for (const line of lines.slice(0, 5)) {
    if (dateRe.test(line)) continue;
    if (/^(領収書|レシート|receipt|明細|税込|合計)/i.test(line)) continue;
    if (/^[0-9¥￥,\-:/\s]+$/.test(line)) continue;
    vendor = line.slice(0, 40);
    break;
  }

  return { date, amount, vendor, excerpt: lines.slice(0, 15).join(' / ').slice(0, 400) };
}

/** ファイルがOCR対象(画像)か */
export function isOcrTarget(mimeType: string): boolean {
  return OCR_MIME.includes(mimeType);
}

/** Vision API で画像ファイルの文字を抽出する。戻り値: 抽出テキスト */
export function ocrImageFile(file: GoogleAppsScript.Drive.File): string {
  const ic = getIntegrationConfig();
  if (!ic.visionApiKey) {
    throw new ConfigError(
      'レシートOCRには Script Properties の VISION_API_KEY(Google Cloud Vision APIキー)の設定が必要です。docs/integration-guide.md を参照してください。',
    );
  }
  const blob = file.getBlob();
  const payload = {
    requests: [
      {
        image: { content: Utilities.base64Encode(blob.getBytes()) },
        features: [{ type: 'TEXT_DETECTION' }],
        imageContext: { languageHints: ['ja'] },
      },
    ],
  };
  const res = UrlFetchApp.fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(ic.visionApiKey)}`,
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    },
  );
  if (res.getResponseCode() >= 300) {
    throw new Error(
      `Vision API エラー(${res.getResponseCode()}): ${res.getContentText().slice(0, 200)}`,
    );
  }
  const body = JSON.parse(res.getContentText());
  return body?.responses?.[0]?.fullTextAnnotation?.text ?? '';
}
