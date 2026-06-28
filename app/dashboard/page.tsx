"use client";
import { useState, useEffect } from "react";
import {
  TrendingUp, TrendingDown, Star, Users, RefreshCw,
  ArrowUpRight, CheckCircle2, AlertCircle, Zap, Calendar
} from "lucide-react";

const MOCK_DIGEST = {
  date: "2026年6月28日（日）",
  metrics: [
    { label: "Google順位 #縮毛矯正 立川", value: "3位", prev: "4位", trend: "up" },
    { label: "口コミ評価", value: "4.71★", prev: "4.68★", trend: "up" },
    { label: "今月新規数", value: "28名", prev: "22名", trend: "up" },
    { label: "リピート率", value: "73%", prev: "71%", trend: "up" },
    { label: "LINE友達数", value: "342名", prev: "338名", trend: "up" },
    { label: "Instagram フォロワー", value: "1,247名", prev: "1,203名", trend: "up" },
  ],
  achievements: [
    "昨日の口コミ返信 3件 → AI返信完了",
    "Google Business 投稿 1件公開",
    "縮毛矯正 ビフォーアフター Instagram投稿 → 6媒体展開完了",
    "ブログ記事「立川 縮毛矯正おすすめ」リライト完了",
  ],
  tasks: [
    { priority: "high", task: "口コミ新着1件 → AI返信を確認・承認する", module: "MEO" },
    { priority: "high", task: "月曜投稿コンテンツの承認（3件待機中）", module: "Content Hub" },
    { priority: "medium", task: "競合「OCEAN TOKYO 立川」が写真を5枚追加", module: "競合分析" },
    { priority: "medium", task: "「髪質改善 立川」の検索順位が5位→7位に低下", module: "SEO" },
    { priority: "low", task: "今週の求人Instagram Story 作成", module: "Recruit" },
  ],
  improvements: [
    "Google Business の投稿頻度を週3回→週5回に増加で競合に差をつけられます",
    "「ショートヘア 縮毛矯正」の検索ボリュームが上昇中。記事作成を推奨します",
    "リピート率73%は業界平均68%を上回っています。さらにLINE配信強化で80%を目指せます",
  ],
  alert: "競合「美容室A」が先週口コミを8件獲得。口コミ促進QRコードの配布を今週中に開始してください。",
};

function MetricCard({
  label, value, prev, trend
}: {
  label: string; value: string; prev: string; trend: "up" | "down";
}) {
  return (
    <div className="dashboard-card">
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <p className="text-2xl font-semibold text-white mb-1">{value}</p>
      <div className={`flex items-center gap-1 text-xs ${trend === "up" ? "text-emerald-400" : "text-red-400"}`}>
        {trend === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
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
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

export default function DigestPage() {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const digest = MOCK_DIGEST;

  const handleGenerate = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    setLoading(false);
    setGenerated(true);
  };

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-gold" />
            <p className="text-xs text-gold tracking-widest uppercase">CEO Daily Digest</p>
          </div>
          <h1 className="text-2xl font-semibold text-white">{digest.date}</h1>
          <p className="text-sm text-gray-500 mt-1">毎朝AIが自動生成する経営ダッシュボード</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/30 rounded-lg text-gold text-sm hover:bg-gold/20 transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "生成中..." : "今日のDigest生成"}
        </button>
      </div>

      {/* Alert */}
      <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-3">
        <AlertCircle size={18} className="text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-200">{digest.alert}</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {digest.metrics.map((m) => (
          <MetricCard key={m.label} {...m} trend={m.trend as "up" | "down"} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Yesterday achievements */}
        <div className="dashboard-card">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <h2 className="text-sm font-medium text-white">昨日の成果</h2>
          </div>
          <ul className="space-y-2">
            {digest.achievements.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                {a}
              </li>
            ))}
          </ul>
        </div>

        {/* Improvements */}
        <div className="dashboard-card">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-gold" />
            <h2 className="text-sm font-medium text-white">AIからの改善提案</h2>
          </div>
          <ul className="space-y-3">
            {digest.improvements.map((imp, i) => (
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
          {digest.tasks.map((t, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-[#12121A] rounded-lg">
              <span className="text-gray-600 text-sm w-5 shrink-0">{i + 1}.</span>
              <PriorityBadge priority={t.priority} />
              <p className="text-sm text-gray-300 flex-1">{t.task}</p>
              <span className="text-[10px] text-gray-600 bg-[#1E1E2E] px-2 py-1 rounded shrink-0">{t.module}</span>
            </div>
          ))}
        </div>
      </div>

      {generated && (
        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <p className="text-sm text-emerald-400">✓ 最新のDigestを生成しました。各モジュールのリアルデータを接続すると自動更新されます。</p>
        </div>
      )}
    </div>
  );
}
