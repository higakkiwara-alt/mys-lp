"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import {
  TrendingUp, TrendingDown, Star, RefreshCw,
  ArrowUpRight, CheckCircle2, AlertCircle, Zap, Calendar,
  Users, MapPin, BarChart2, Instagram, MessageSquare
} from "lucide-react";

const RevenueChart = dynamic(() => import("@/components/charts/KpiChart").then(m => m.RevenueChart), { ssr: false });
const CustomerChart = dynamic(() => import("@/components/charts/KpiChart").then(m => m.CustomerChart), { ssr: false });
const RankChart = dynamic(() => import("@/components/charts/KpiChart").then(m => m.RankChart), { ssr: false });

const METRICS = [
  { label: "今月売上", value: "¥920,000", prev: "¥870,000", trend: "up", icon: BarChart2 },
  { label: "新規顧客", value: "28名", prev: "27名", trend: "up", icon: Users },
  { label: "リピート率", value: "73%", prev: "71%", trend: "up", icon: ArrowUpRight },
  { label: "Google順位", value: "#3位", prev: "#4位", trend: "up", icon: MapPin },
  { label: "口コミ評価", value: "★4.71", prev: "★4.68", trend: "up", icon: Star },
  { label: "Instagram", value: "1,247", prev: "1,203", trend: "up", icon: Instagram },
  { label: "LINE 友達", value: "342名", prev: "338名", trend: "up", icon: MessageSquare },
  { label: "失客率", value: "12%", prev: "15%", trend: "up", icon: TrendingDown },
];

const TASKS = [
  { priority: "high", task: "口コミ新着1件 → AI返信を確認・承認する", module: "MEO", href: "/dashboard/meo" },
  { priority: "high", task: "月曜投稿コンテンツの承認（3件待機中）", module: "Content Hub", href: "/dashboard/content-hub" },
  { priority: "medium", task: "競合「OCEAN TOKYO」が写真を5枚追加", module: "競合分析", href: "/dashboard/competitor" },
  { priority: "medium", task: "「髪質改善 立川」の検索順位が7位に低下", module: "SEO", href: "/dashboard/seo" },
  { priority: "low", task: "今週の求人Instagram Story 作成", module: "Recruit", href: "/dashboard/recruit" },
];

function MetricCard({
  label, value, prev, trend, icon: Icon
}: {
  label: string; value: string; prev: string;
  trend: "up" | "down"; icon: React.ElementType;
}) {
  return (
    <div className="dashboard-card hover:border-gold/20 transition-colors cursor-default">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500">{label}</p>
        <Icon size={14} className="text-gray-600" />
      </div>
      <p className="text-2xl font-semibold text-white mb-1">{value}</p>
      <div className={`flex items-center gap-1 text-xs ${trend === "up" ? "text-emerald-400" : "text-red-400"}`}>
        {trend === "up" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        <span>前回: {prev}</span>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    high: { bg: "bg-red-500/20", text: "text-red-400", label: "重要" },
    medium: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "通常" },
    low: { bg: "bg-blue-500/20", text: "text-blue-400", label: "低" },
  };
  const c = map[priority] ?? map.low;
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>{c.label}</span>
  );
}

type DigestResult = {
  achievements: string[];
  tasks: Array<{ priority: string; task: string; module: string }>;
  improvements: string[];
  alert?: string;
};

export default function DigestPage() {
  const [loading, setLoading] = useState(false);
  const [digest, setDigest] = useState<DigestResult | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/digest");
      if (res.ok) {
        const data = await res.json();
        setDigest(data);
      }
    } catch {
      // fall through — keep showing static data
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-gold" />
            <p className="text-xs text-gold tracking-widest uppercase">CEO Daily Digest</p>
          </div>
          <h1 className="text-2xl font-semibold text-white">2026年6月28日（日）</h1>
          <p className="text-sm text-gray-500 mt-1">毎朝6:00 に GitHub Actions が自動生成 · 最終更新: 06:00</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/30 rounded-lg text-gold text-sm hover:bg-gold/20 transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "生成中..." : "今すぐ再生成"}
        </button>
      </div>

      {/* Alert */}
      <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-3">
        <AlertCircle size={18} className="text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-200">
          競合「OCEAN TOKYO 立川」が今週口コミを8件獲得。口コミ促進QRコードの配布を今週中に開始してください。
        </p>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {METRICS.map((m) => (
          <MetricCard key={m.label} {...m} trend={m.trend as "up" | "down"} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="dashboard-card">
          <p className="text-xs text-gray-500 mb-3">月次売上推移</p>
          <RevenueChart />
        </div>
        <div className="dashboard-card">
          <p className="text-xs text-gray-500 mb-3">新規 vs リピート客数</p>
          <CustomerChart />
        </div>
        <div className="dashboard-card">
          <p className="text-xs text-gray-500 mb-3">Google 検索順位推移（低いほど良い）</p>
          <RankChart />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Achievements */}
        <div className="dashboard-card">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <h2 className="text-sm font-medium text-white">昨日の成果</h2>
          </div>
          <ul className="space-y-2">
            {[
              "口コミ返信 3件 → AI返信完了",
              "Google Business 投稿 1件公開",
              "縮毛矯正ビフォーアフター → 6媒体展開完了",
              "ブログ「立川 縮毛矯正おすすめ」リライト完了",
            ].map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                {a}
              </li>
            ))}
          </ul>
        </div>

        {/* AI Improvements */}
        <div className="dashboard-card">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-gold" />
            <h2 className="text-sm font-medium text-white">AIからの改善提案</h2>
          </div>
          <ul className="space-y-3">
            {[
              "Google Business の投稿頻度を週3回→週5回に増加で競合に差をつけられます",
              "「ショートヘア 縮毛矯正」の検索ボリュームが上昇中。記事作成を推奨します",
              "リピート率73%は業界平均68%を上回っています。LINEで80%を目指せます",
            ].map((imp, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <ArrowUpRight size={14} className="text-gold mt-0.5 shrink-0" />
                {imp}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Today's tasks */}
      <div className="dashboard-card">
        <div className="flex items-center gap-2 mb-4">
          <Star size={16} className="text-gold" />
          <h2 className="text-sm font-medium text-white">今日やること（AI優先順位付き）</h2>
        </div>
        <div className="space-y-3">
          {TASKS.map((t, i) => (
            <a key={i} href={t.href} className="flex items-center gap-3 p-3 bg-[#12121A] rounded-lg hover:bg-[#1A1A2A] transition-colors group">
              <span className="text-gray-600 text-sm w-5 shrink-0">{i + 1}.</span>
              <PriorityBadge priority={t.priority} />
              <p className="text-sm text-gray-300 flex-1 group-hover:text-white transition-colors">{t.task}</p>
              <span className="text-[10px] text-gray-600 bg-[#1E1E2E] px-2 py-1 rounded shrink-0">{t.module}</span>
              <ArrowUpRight size={12} className="text-gray-600 group-hover:text-gold shrink-0" />
            </a>
          ))}
        </div>
      </div>

      {digest && (
        <div className="mt-6 space-y-4">
          {digest.alert && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{digest.alert}</p>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="dashboard-card">
              <p className="text-xs text-gold tracking-widest uppercase mb-3">昨日の成果</p>
              <ul className="space-y-2">
                {digest.achievements.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
            <div className="dashboard-card">
              <p className="text-xs text-gold tracking-widest uppercase mb-3">今日のタスク（AI生成）</p>
              <ul className="space-y-2">
                {digest.tasks.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <PriorityBadge priority={t.priority} />
                    <span>{t.task}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="dashboard-card">
              <p className="text-xs text-gold tracking-widest uppercase mb-3">改善提案</p>
              <ul className="space-y-2">
                {digest.improvements.map((imp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <Zap size={12} className="text-gold shrink-0 mt-0.5" />
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
