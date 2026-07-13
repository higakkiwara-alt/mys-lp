/**
 * ビルドスクリプト
 * - src/index.ts を esbuild で 1 ファイル(dist/main.js)にバンドルする
 * - Apps Script は ES Modules 非対応のため IIFE 形式で出力し、
 *   index.ts 内で globalThis へ公開した関数がトリガー・メニューから呼べるようにする
 * - appsscript.json を dist/ へコピーする(clasp push の対象は dist/)
 */
import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

mkdirSync(resolve(root, 'dist'), { recursive: true });

await build({
  entryPoints: [resolve(root, 'src/index.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2019',
  charset: 'utf8',
  outfile: resolve(root, 'dist/main.js'),
  banner: {
    js: '// OTK COMPANY 経理引き継ぎシステム (自動生成ファイル。編集しないでください。src/ を編集して npm run build)',
  },
});

copyFileSync(resolve(root, 'appsscript.json'), resolve(root, 'dist/appsscript.json'));

console.log('build OK: dist/main.js, dist/appsscript.json');
