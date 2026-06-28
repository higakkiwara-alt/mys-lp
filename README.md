# AI Salon OS — 世界一自動化された美容室システム

Mys（ミース）立川・髪質改善専門サロンの集客・運営を完全自動化するWebシステム。

## 機能一覧

| モジュール | 機能 |
|---|---|
| **CEO Daily Digest** | 毎朝AIが生成する経営レポート（KPI・今日のタスク・改善提案） |
| **Content Hub** | Instagram投稿を起点に7媒体へ自動展開 |
| **MEO 管理** | Google Business投稿・AI口コミ返信・MEO改善チェック |
| **SEO Factory** | キーワード順位監視・AIブログ生成・リライト提案 |
| **競合分析** | 毎日自動取得・比較・AI改善提案 |
| **AI 画像スタジオ** | Before/After生成・背景除去・全サイズ自動リサイズ |
| **Company Brain** | 音声・会議・カルテ・マニュアルをAIで検索可能に |

## セットアップ

```bash
# 1. 依存関係のインストール
npm install

# 2. 環境変数の設定
cp .env.local.example .env.local
# .env.local を編集してAPIキーを設定

# 3. データベースのセットアップ
npm run db:push

# 4. 開発サーバーの起動
npm run dev
```

## 必要なAPIキー

| API | 用途 | 取得先 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Content Hub, MEO口コミ返信, SEO, Digest | console.anthropic.com |
| `DATABASE_URL` | データ保存 | Supabase |
| `GOOGLE_MAPS_API_KEY` | 競合分析 | Google Cloud Console |
| `GOOGLE_BUSINESS_*` | MEO投稿・口コミ管理 | Google Business Profile API |
| `INSTAGRAM_ACCESS_TOKEN` | Content Hub | Meta for Developers |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE配信 | LINE Developers |

## MVP で動作する機能（APIキー不要）

- ランディングページ
- ダッシュボード全UI
- モックデータでのデモ表示

## 技術スタック

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **DB**: PostgreSQL (Supabase) + Prisma ORM
- **AI**: Claude (Anthropic) + OpenAI
- **APIs**: Google Business Profile, Maps, Instagram Graph, LINE
- **CI/CD**: GitHub Actions

## フェーズ計画

**Phase 1（現在）**: MVP - UI完成、主要APIルート実装  
**Phase 2**: DB接続、実データ表示、Content Hub本番稼働  
**Phase 3**: 画像自動処理、競合分析自動化、LINE・Instagram API連携  
**Phase 4**: 完全自動化、Obsidian連携、音声メモ自動保存
