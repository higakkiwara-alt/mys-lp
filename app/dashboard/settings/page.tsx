"use client";
import { useState } from "react";
import { Settings, CheckCircle2, XCircle, Loader2, Eye, EyeOff, ExternalLink } from "lucide-react";

type ApiKey = {
  id: string;
  label: string;
  envKey: string;
  description: string;
  docsUrl: string;
  required: boolean;
  module: string;
};

const API_KEYS: ApiKey[] = [
  {
    id: "anthropic",
    label: "Anthropic API Key",
    envKey: "ANTHROPIC_API_KEY",
    description: "Content Hub・MEO口コミ返信・SEOブログ・CEO Digestに必要",
    docsUrl: "https://console.anthropic.com",
    required: true,
    module: "全モジュール",
  },
  {
    id: "supabase_url",
    label: "Supabase URL",
    envKey: "NEXT_PUBLIC_SUPABASE_URL",
    description: "データの永続化に必要",
    docsUrl: "https://supabase.com",
    required: true,
    module: "データ保存",
  },
  {
    id: "supabase_key",
    label: "Supabase Anon Key",
    envKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    description: "Supabase への接続に必要",
    docsUrl: "https://supabase.com",
    required: true,
    module: "データ保存",
  },
  {
    id: "google_maps",
    label: "Google Maps API Key",
    envKey: "GOOGLE_MAPS_API_KEY",
    description: "競合分析（Google Maps Places API）に必要",
    docsUrl: "https://console.cloud.google.com",
    required: false,
    module: "競合分析",
  },
  {
    id: "google_client",
    label: "Google Client ID",
    envKey: "GOOGLE_CLIENT_ID",
    description: "Google Business Profile API に必要",
    docsUrl: "https://console.cloud.google.com",
    required: false,
    module: "MEO管理",
  },
  {
    id: "instagram",
    label: "Instagram Access Token",
    envKey: "INSTAGRAM_ACCESS_TOKEN",
    description: "Instagram投稿・インサイト取得に必要",
    docsUrl: "https://developers.facebook.com",
    required: false,
    module: "Content Hub",
  },
  {
    id: "line",
    label: "LINE Channel Access Token",
    envKey: "LINE_CHANNEL_ACCESS_TOKEN",
    description: "LINE公式アカウントへの投稿に必要",
    docsUrl: "https://developers.line.biz",
    required: false,
    module: "Content Hub",
  },
  {
    id: "wordpress_url",
    label: "WordPress URL",
    envKey: "WORDPRESS_URL",
    description: "WordPressブログへの自動投稿に必要",
    docsUrl: "#",
    required: false,
    module: "SEO",
  },
  {
    id: "openai",
    label: "OpenAI API Key",
    envKey: "OPENAI_API_KEY",
    description: "画像生成・Before/After自動化・GPT-4 Vision に必要",
    docsUrl: "https://platform.openai.com",
    required: false,
    module: "画像スタジオ",
  },
  {
    id: "removebg",
    label: "Remove.bg API Key",
    envKey: "REMOVE_BG_API_KEY",
    description: "高精度な背景除去に必要（なければOpenAIで代替）",
    docsUrl: "https://www.remove.bg/api",
    required: false,
    module: "画像スタジオ",
  },
];

function ApiKeyRow({ apiKey }: { apiKey: ApiKey }) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-4 bg-[#12121A] rounded-xl border border-[#2A2A3E]">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white">{apiKey.label}</p>
            {apiKey.required && (
              <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">必須</span>
            )}
            <span className="text-[10px] text-gray-600 bg-[#1E1E2E] px-1.5 py-0.5 rounded">{apiKey.module}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{apiKey.description}</p>
        </div>
        <a
          href={apiKey.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-gold hover:text-gold-light shrink-0 ml-4"
        >
          取得 <ExternalLink size={10} />
        </a>
      </div>
      <div className="flex gap-2 mt-2">
        <div className="relative flex-1">
          <input
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`${apiKey.envKey}を入力`}
            className="w-full bg-[#1E1E2E] border border-[#2A2A3E] rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gold/50 pr-8"
          />
          <button
            onClick={() => setShow(!show)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            {show ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !value}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
            saved
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20"
          }`}
        >
          {saving ? (
            <Loader2 size={12} className="animate-spin" />
          ) : saved ? (
            <span className="flex items-center gap-1"><CheckCircle2 size={12} />保存済</span>
          ) : (
            "保存"
          )}
        </button>
      </div>
    </div>
  );
}

const SETUP_STEPS = [
  {
    step: 1,
    title: "Supabase プロジェクト作成",
    description: "supabase.com でプロジェクトを作成し、URLとAnon Keyを取得",
    done: false,
  },
  {
    step: 2,
    title: "データベースのマイグレーション",
    description: "ターミナルで npx prisma db push を実行",
    done: false,
  },
  {
    step: 3,
    title: "Anthropic API Key の設定",
    description: "console.anthropic.com でAPIキーを取得し、左の欄に入力",
    done: false,
  },
  {
    step: 4,
    title: "Google Business API の設定",
    description: "Google Cloud Console でプロジェクト作成 → OAuth設定 → リフレッシュトークン取得",
    done: false,
  },
  {
    step: 5,
    title: "Vercel / Docker でデプロイ",
    description: "環境変数を本番サーバーに設定してデプロイ",
    done: false,
  },
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

      <div className="flex gap-2 mb-6">
        {(["apikeys", "setup", "cron"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              activeTab === tab ? "bg-gold/20 text-gold border border-gold/30" : "bg-[#1E1E2E] text-gray-400 border border-[#2A2A3E]"
            }`}
          >
            {tab === "apikeys" ? "API キー" : tab === "setup" ? "セットアップ手順" : "自動化スケジュール"}
          </button>
        ))}
      </div>

      {activeTab === "apikeys" && (
        <div className="space-y-3">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-4">
            <p className="text-xs text-blue-300">
              APIキーは .env.local ファイルに直接設定することを推奨します。本番環境では Vercel / Docker の環境変数として設定してください。
              このUIはローカル開発用のガイドです。
            </p>
          </div>
          {API_KEYS.map((key) => <ApiKeyRow key={key.id} apiKey={key} />)}
        </div>
      )}

      {activeTab === "setup" && (
        <div className="space-y-4">
          {SETUP_STEPS.map((step) => (
            <div key={step.step} className="flex gap-4 p-4 dashboard-card">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${step.done ? "bg-emerald-500/20" : "bg-gold/20"}`}>
                {step.done ? (
                  <CheckCircle2 size={16} className="text-emerald-400" />
                ) : (
                  <span className="text-gold text-sm font-bold">{step.step}</span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{step.title}</p>
                <p className="text-xs text-gray-500 mt-1">{step.description}</p>
              </div>
            </div>
          ))}
          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-3">クイックスタートコマンド</p>
            <div className="bg-[#0A0A14] rounded-lg p-4 font-mono text-xs space-y-1">
              {[
                "# 1. 環境変数の設定",
                "cp .env.local.example .env.local",
                "# .env.local を編集してAPIキーを入力",
                "",
                "# 2. 依存関係のインストール",
                "npm install",
                "",
                "# 3. データベースの初期化",
                "npx prisma generate",
                "npx prisma db push",
                "",
                "# 4. 開発サーバーの起動",
                "npm run dev",
              ].map((line, i) => (
                <p key={i} className={line.startsWith("#") ? "text-gray-600" : "text-emerald-400"}>
                  {line || " "}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "cron" && (
        <div className="space-y-4">
          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-4">GitHub Actions スケジュール</p>
            <div className="space-y-3">
              {[
                { name: "CEO Daily Digest", schedule: "毎日 6:00 JST", file: ".github/workflows/daily-digest.yml", status: "active" },
                { name: "競合データ取得", schedule: "毎日 7:00 JST", file: ".github/workflows/daily-digest.yml", status: "active" },
                { name: "SEO 順位チェック", schedule: "毎日 6:30 JST", file: ".github/workflows/daily-digest.yml", status: "active" },
              ].map((job) => (
                <div key={job.name} className="flex items-center justify-between p-3 bg-[#12121A] rounded-lg">
                  <div>
                    <p className="text-sm text-white">{job.name}</p>
                    <p className="text-xs text-gray-500">{job.schedule} · {job.file}</p>
                  </div>
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">稼働中</span>
                </div>
              ))}
            </div>
          </div>
          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-3">GitHub Secrets の設定</p>
            <div className="space-y-2">
              {["CRON_SECRET", "APP_URL"].map((secret) => (
                <div key={secret} className="flex items-center gap-3 p-2 bg-[#12121A] rounded">
                  <XCircle size={14} className="text-gray-600" />
                  <p className="text-xs text-gray-400 font-mono">{secret}</p>
                  <p className="text-xs text-gray-600 ml-auto">未設定</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-3">
              GitHub リポジトリ → Settings → Secrets and variables → Actions で設定
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
