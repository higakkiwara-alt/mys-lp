/**
 * LockService ラッパー
 * 取得失敗時は明確なエラー、解放は finally で保証する。
 */

export function withScriptLock<T>(fn: () => T, timeoutMs = 30 * 1000): T {
  const lock = LockService.getScriptLock();
  const ok = lock.tryLock(timeoutMs);
  if (!ok) {
    throw new Error(
      '他の処理が実行中のためロックを取得できませんでした。しばらく待ってから再実行してください。',
    );
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}
