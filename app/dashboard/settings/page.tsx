"use client";
import { useState } from "react";
import { Settings, CheckCircle2, XCircle, Loader2, Eye, EyeOff, ExternalLink, Copy, AlertCircle } from "lucide-react";

type ApiKey = {
  id: string;
  label: string;
  envKey: string;
  description: string;
  docsUrl: string;
  required: boolean;
  module: string;
  howTo: string[];
};

const API_KEYS: ApiKey[] = [
  {
    id: "anthropic",
    label: "Anthropic（Claude）API Key",
    envKey: "ANTHROPIC_API_KEY",
    description: "CEO Digest・コンテンツ生成・口コミ返信・AI Q&Aなど全AIに必要",
    docsUrl: "https://console.anthropic.com/settings/keys",
    required: true,
    module: "全AIモジュール",
    howTo: [
      "console.anthropic.com にアクセスしてアカウント登録",
      "左メニュー「API Keys」→「Create Key」",
      "名前を入力して「Create Key」をクリック",
      "表示されたキー（sk-ant-...）をコピーして下に貼り付け",
    ],
  },
  {
    id: "openai",
    label: "OpenAI API Key",
    envKey: "OPENAI_API_KEY",
    description: "画像生成（DALL-E 3）・音声→テキスト（Whisper）・画像分析（GPT-4 Vision）に必要",
    docsUrl: "https://platform.openai.com/api-keys",
    required: false,
    module: "画像スタジオ・スタイリスト脳",
    howTo: [
      "platform.openai.com にアクセスしてアカウント登録",
      "右上のメニュー「API keys」をクリック",
      "「Create new secret key」をクリック",
      "表示されたキー（sk-...）をコピーして下に貼り付け",
    ],
  },
  {
    id: "supabase_url",
    label: "Supabase URL",
    envKey: "NEXT_PUBLIC_SUPABASE_URL",
    description: "お客様データ・投稿履歴などをクラウドに保存するためのデータベース",
    docsUrl: "https://supabase.com/dashboard",
    required: true,
    module: "データ保存（全機能）",
    howTo: [
      "supabase.com にアクセスして「Start for free」",
      "「New project」でプロジェクトを作成",
      "「Project Settings」→「API」タブを開く",
      "「Project URL」をコピーして下に貼り付け",
    ],
  },
  {
    id: "supabase_key",
    label: "Supabase Anon Key",
    envKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    description: "Supabaseへの接続に使う公開キー",
    docsUrl: "https://supabase.com/dashboard",
    required: true,
    module: "データ保存（全機能）",
    howTo: [
      "上と同じページの「Project Settings」→「API」",
      "「anon public」と書かれたキーをコピー",
    ],
  },
  {
    id: "line",
    label: "LINE Channel Access Token",
    envKey: "LINE_CHANNEL_ACCESS_TOKEN",
    description: "リテンションAIからお客様へのLINE自動送信・Webhook受信に必要",
    docsUrl: "https://developers.line.biz/console/",
    required: false,
    module: "リテンション AI・セールスAI",
    howTo: [
      "developers.line.biz でビジネスアカウントを作成",
      "「Messaging API」チャネルを作成",
      "「Messaging API」タブ→「Channel access token」で発行",
      "表示されたトークンをコピーして貼り付け",
    ],
  },
  {
    id: "instagram",
    label: "Instagram Access Token",
    envKey: "INSTAGRAM_ACCESS_TOKEN",
    description: "Instagram投稿の自動公開・インサイト取得・DM自動返信に必要",
    docsUrl: "https://developers.facebook.com/apps/",
    required: false,
    module: "Content Hub・セールスAI",
    howTo: [
      "Meta for Developersでアプリを作成",
      "「Instagram Basic Display」を追加",
      "「Generate Token」でアクセストークンを取得",
    ],
  },
  {
    id: "google_client",
    label: "Google Client ID / Secret",
    envKey: "GOOGLE_CLIENT_ID",
    description: "Google Business Profileへの投稿・口コミ管理に必要",
    docsUrl: "https://console.cloud.google.com/",
    required: false,
    module: "MEO管理",
    howTo: [
      "Google Cloud Consoleで新しいプロジェクトを作成",
      "「APIとサービス」→「認証情報」→「OAuth 2.0 クライアント ID」を作成",
      "クライアントIDとシークレットをコピー",
    ],
  },
  {
    id: "wordpress_url",
    label: "WordPress サイトURL",
    envKey: "WORDPRESS_URL",
    description: "SEO記事のWordPressへの自動下書き・公開に必要",
    docsUrl: "#",
    required: false,
    module: "SEO Factory",
    howTo: [
      "WordPressの管理画面URLを入力（例: https://myblog.com）",
      "「ユーザー」→「プロフィール」でアプリケーションパスワードを生成",
      "WORDPRESS_USER と WORDPRESS_APP_PASSWORD も設定",
    ],
  },
  {
    id: "removebg",
    label: "Remove.bg API Key",
    envKey: "REMOVE_BG_API_KEY",
    description: "施術写真の背景を高精度で自動除去。なければAIで代替（精度は下がります）",
    docsUrl: "https://www.remove.bg/api",
    required: false,
    module: "画像スタジオ",
    howTo: [
      "remove.bg にアクセスしてアカウント登録",
      "「API」タブ→「Get API Key」をクリック",
      "表示されたキーをコピーして貼り付け",
    ],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-gray-500 hover:text-gold transition-colors">
      {copied ? <CheckCircle2 size={11} className="text-emerald-400" /> : <Copy size={11} />}
    </button>
  );
}

function ApiKeyRow({ apiKey }: { apiKey: ApiKey }) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-4 bg-[#12121A] rounded-xl border border-[#2A2A3E] space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-white">{apiKey.label}</p>
            {apiKey.required && <span className="text-[9px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">必須</span>}
            <span className="text-[9px] text-gray-500 bg-[#1E1E2E] px-1.5 py-0.5 rounded">{apiKey.module}</span>
            {saved && <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">✓ 保存済み</span>}
          </div>
          <p className="text-xs text-gray-500 mt-1">{apiKey.description}</p>
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <button onClick={() => setShowGuide(!showGuide)}
            className="text-[10px] text-gold hover:text-gold-light border border-gold/20 px-2 py-1 rounded hover:bg-gold/10 transition-colors">
            取得方法
          </button>
          <a href={apiKey.docsUrl} target="_blank" rel="noopener noreferrer"
            className="text-gray-500 hover:text-gold">
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {showGuide && (
        <div className="bg-[#0A0A14] border border-[#2A2A3E] rounded-lg p-3">
          <p className="text-[10px] text-gold mb-2">取得手順</p>
          <ol className="space-y-1">
            {apiKey.howTo.map((step, i) => (
              <li key={i} className="flex gap-2 text-[11px] text-gray-400">
                <span className="text-gold shrink-0">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-3 p-2 bg-[#12121A] rounded font-mono text-[10px] flex items-center justify-between">
            <span className="text-emerald-400">{apiKey.envKey}=your_key_here</span>
            <CopyButton text={`${apiKey.envKey}=`} />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input type={show ? "text" : "password"} value={value} onChange={(e) => setValue(e.target.value)}
            placeholder={`${apiKey.envKey} を貼り付け`}
            className="w-full bg-[#1E1E2E] border border-[#2A2A3E] rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gold/50 pr-8" />
          <button onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            {show ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        </div>
        <button onClick={handleSave} disabled={saving || !value.trim()}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-40 ${saved ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20"}`}>
          {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? "保存済" : "保存"}
        </button>
      </div>
    </div>
  );
}

const VERCEL_STEPS = [
  { title: "Vercel ダッシュボードを開く", desc: "vercel.com にアクセスしてログイン" },
  { title: "プロジェクトを選択", desc: "「mys-lp」プロジェクトをクリック" },
  { title: "設定を開く", desc: "上部タブ「Settings」→「Environment Variables」" },
  { title: "変数を追加", desc: "「Add New」で変数名と値を1つずつ入力して「Save」" },
  { title: "再デプロイ", desc: "「Deployments」タブ→「Redeploy」で設定を反映" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"apikeys" | "setup" | "cron">("apikeys");

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Settings size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">Settings</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">設定</h1>
        <p className="text-sm text-gray-500 mt-1">API キー・セットアップ・自動化スケジュールの管理</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(["apikeys", "setup", "cron"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm transition-all border ${activeTab === tab ? "bg-gold/20 text-gold border-gold/30" : "bg-[#1E1E2E] text-gray-400 border-[#2A2A3E]"}`}>
            {tab === "apikeys" ? "🔑 API キー" : tab === "setup" ? "📋 設定手順" : "⏰ 自動スケジュール"}
          </button>
        ))}
      </div>

      {activeTab === "apikeys" && (
        <div className="space-y-3">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-2">
            <AlertCircle size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300">
              APIキーは「Vercel の環境変数」または「.env.local ファイル」に設定します。<br />
              各キーの「取得方法」ボタンで手順を確認できます。まずは<strong>Anthropic API Key</strong>と<strong>Supabase</strong>から設定するとAI機能が動き始めます。
            </p>
          </div>
          {API_KEYS.map((key) => <ApiKeyRow key={key.id} apiKey={key} />)}
        </div>
      )}

      {activeTab === "setup" && (
        <div className="space-y-4">
          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-4">Vercel への環境変数の設定方法</p>
            <div className="space-y-3">
              {VERCEL_STEPS.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-gold text-xs font-bold">{i + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm text-white">{step.title}</p>
                    <p className="text-xs text-gray-500">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-1">ローカル開発環境での設定</p>
            <p className="text-xs text-gray-500 mb-3">プロジェクトのフォルダに <code className="text-gold bg-[#12121A] px-1 rounded">.env.local</code> ファイルを作成して以下を貼り付け</p>
            <div className="bg-[#0A0A14] rounded-lg p-4 font-mono text-xs space-y-1 relative">
              <CopyButton text={[
                "ANTHROPIC_API_KEY=sk-ant-xxxx",
                "OPENAI_API_KEY=sk-xxxx",
                "NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co",
                "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx",
                "LINE_CHANNEL_ACCESS_TOKEN=xxxx",
                "INSTAGRAM_ACCESS_TOKEN=xxxx",
                "DATABASE_URL=postgresql://xxxx",
              ].join("\n")} />
              {[
                ["ANTHROPIC_API_KEY", "sk-ant-xxxx", true],
                ["OPENAI_API_KEY", "sk-xxxx", false],
                ["NEXT_PUBLIC_SUPABASE_URL", "https://xxxx.supabase.co", true],
                ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJxxxx", true],
                ["LINE_CHANNEL_ACCESS_TOKEN", "xxxx", false],
                ["INSTAGRAM_ACCESS_TOKEN", "xxxx", false],
                ["DATABASE_URL", "postgresql://xxxx", false],
              ].map(([key, val, req]) => (
                <p key={key as string}>
                  <span className={req ? "text-gold" : "text-gray-500"}>{key as string}</span>
                  <span className="text-gray-600">=</span>
                  <span className="text-emerald-400">{val as string}</span>
                  {req && <span className="text-red-400 ml-2 text-[9px]"># 必須</span>}
                </p>
              ))}
            </div>
          </div>

          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-3">データベース初期化コマンド</p>
            <div className="bg-[#0A0A14] rounded-lg p-4 font-mono text-xs space-y-1">
              {[
                ["# 依存パッケージをインストール", true],
                ["npm install", false],
                ["", false],
                ["# データベースのテーブルを作成", true],
                ["npx prisma generate", false],
                ["npx prisma db push", false],
                ["", false],
                ["# 開発サーバー起動", true],
                ["npm run dev", false],
              ].map(([line, isComment], i) => (
                <p key={i} className={isComment ? "text-gray-600" : "text-emerald-400"}>{(line as string) || " "}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "cron" && (
        <div className="space-y-4">
          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-1">Vercel Cron ジョブ（自動設定済み）</p>
            <p className="text-xs text-gray-500 mb-4">vercel.json に設定済みです。Vercel Pro プラン以上で自動実行されます。</p>
            <div className="space-y-3">
              {[
                { name: "CEO Daily Digest", time: "毎朝 6:00 JST", endpoint: "/api/digest", desc: "売上・タスク・改善提案を自動生成してLINE通知" },
                { name: "MEO ランクチェック", time: "毎朝 7:00 JST", endpoint: "/api/meo/dominator", desc: "競合との差を自動分析してアクション更新" },
                { name: "リテンションスコア更新", time: "毎晩 21:00 JST", endpoint: "/api/retention", desc: "来店間隔から離脱リスクを再計算" },
              ].map((job) => (
                <div key={job.name} className="flex items-start gap-4 p-3 bg-[#12121A] rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-white">{job.name}</p>
                      <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">設定済み</span>
                    </div>
                    <p className="text-xs text-gray-500">{job.desc}</p>
                    <p className="text-[10px] text-gray-600 mt-1 font-mono">{job.time} · {job.endpoint}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-2">
            <AlertCircle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-300">
              Cron ジョブは <strong>Vercel Pro プラン（月20ドル〜）</strong>が必要です。無料プランでは手動実行のみになります。
              APIキーが設定されていれば、各ページのボタンから手動でも実行できます。
            </p>
          </div>

          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <XCircle size={14} className="text-gray-600" />必要な設定
            </p>
            <div className="space-y-2">
              {[
                { key: "CRON_SECRET", desc: "Cronジョブの認証に使うランダムな文字列（例: openssl rand -hex 32 で生成）" },
                { key: "ANTHROPIC_API_KEY", desc: "AIコンテンツ生成に必要" },
              ].map((item) => (
                <div key={item.key} className="p-2 bg-[#12121A] rounded-lg">
                  <p className="text-xs font-mono text-gold">{item.key}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
