/**
 * デプロイスクリプト: verify → clasp push
 * .clasp.json が無い場合は分かりやすいエラーを出して停止する(README 参照)
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

if (!existsSync(resolve(root, '.clasp.json'))) {
  console.error(
    [
      'エラー: .clasp.json が見つかりません。',
      '1. .clasp.json.example をコピーして .clasp.json を作成してください',
      '2. scriptId に Apps Script のスクリプト ID を設定してください',
      '   (スプレッドシート → 拡張機能 → Apps Script → プロジェクトの設定 → スクリプトID)',
      '詳細は README.md の「初回セットアップ」を参照してください。',
    ].join('\n'),
  );
  process.exit(1);
}

execSync('npm run verify', { stdio: 'inherit' });
execSync('npx clasp push', { stdio: 'inherit' });
console.log('deploy OK');
