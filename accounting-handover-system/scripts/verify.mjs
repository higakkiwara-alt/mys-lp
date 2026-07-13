/**
 * 検証スクリプト: lint → test → build を順番に実行し、全て成功したら OK
 */
import { execSync } from 'node:child_process';

const steps = [
  ['lint', 'npm run lint'],
  ['test', 'npm run test'],
  ['build', 'npm run build'],
];

for (const [name, cmd] of steps) {
  console.log(`\n=== verify: ${name} (${cmd}) ===`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch {
    console.error(`\nverify NG: ${name} が失敗しました。上のログを確認してください。`);
    process.exit(1);
  }
}

console.log('\nverify OK: lint / test / build すべて成功しました。');
