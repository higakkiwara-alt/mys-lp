import { defineConfig } from 'vitest/config';

export default defineConfig({
  // 親ディレクトリ(Next.jsプロジェクト)の postcss.config.mjs を拾わないよう
  // PostCSS 設定をインラインで固定する
  css: {
    postcss: {
      plugins: [],
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
