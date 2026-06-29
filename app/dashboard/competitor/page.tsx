"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, AlertTriangle, Eye } from "lucide-react";

const CompetitorRadar = dynamic(() => import("@/components/charts/KpiChart").then(m => m.CompetitorRadar), { ssr: false });

const COMPETITORS = [
  {
    name: "OCEAN TOKYO 立川",
    rating: 4.3,
    reviewCount: 89,
    photoCount: 45,
    postCount: 12,
    rank: 1,
    prevRank: 1,
    area: "立川市錦町",
    lastUpdated: "今日",
  },
  {
    name: "美容室B 立川",
    rating: 4.1,
    reviewCount: 67,
    photoCount: 28,
    postCount: 8,
    rank: 2,
    prevRank: 3,
    area: "立川市柴崎町",
    lastUpdated: "今日",
  },
  {
    name: "Mys（自社）",
    rating: 4.71,
    reviewCount: 117,
    photoCount: 22,
    postCount: 15,
    rank: 3,
    prevRank: 4,
    area: "立川市柴崎町",
    lastUpdated: "今日",
    isSelf: true,
  },
  {
    name: "美容室C 立川",
    rating: 4.0,
    reviewCount: 54,
    photoCount: 31,
    postCount: 6,
    rank: 4,
    prevRank: 2,
    area: "立川市曙町",
    lastUpdated: "今日",
  },
];

const INSIGHTS = [
  { severity: "high", message: "OCEAN TOKYO が今週写真を5枚追加（現在45枚）。Mysは22枚で圧倒的に不足。写真追加が急務。" },
  { severity: "medium", message: "競合「美容室B」の検索順位が3位→2位に上昇。先週の大量投稿が効いている可能性。" },
  { severity: "low", message: "Mysの口コミ数117件は競合最多。評価も4.71と最高。強みとして活かせています。" },
];

type Competitor = typeof COMPETITORS[0];

function DiffBadge({ current, prev, higherIsBetter = true }: { current: number; prev: number; higherIsBetter?: boolean }) {
  const better = higherIsBetter ? current > prev : current < prev;
  const worse = higherIsBetter ? current < prev : current > prev;
  if (better) return <span className="text-emerald-400 text-xs">↑</span>;
  if (worse) return <span className="text-red-400 text-xs">↓</span>;
  return <span className="text-gray-500 text-xs">→</span>;
}

export default function CompetitorPage() {
  const [loading, setLoading] = useState(false);
  const [lastUpdated] = useState("今日 7:00 自動取得");

  const handleRefresh = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    setLoading(false);
  };

  const keyword = "縮毛矯正 立川";

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-gold" />
            <p className="text-xs text-gold tracking-widest uppercase">競合分析</p>
          </div>
          <h1 className="text-2xl font-semibold text-white">Competitor Hunter</h1>
          <p className="text-sm text-gray-500 mt-1">毎日自動取得 · {lastUpdated} · キーワード: {keyword}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/30 rounded-lg text-gold text-sm hover:bg-gold/20 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          今すぐ取得
        </button>
      </div>

      {/* Radar Chart */}
      <div className="dashboard-card mb-6">
        <p className="text-xs text-gold tracking-widest uppercase mb-1">競合比較レーダー</p>
        <p className="text-xs text-gray-500 mb-4">6項目スコア比較（100点満点）</p>
        <CompetitorRadar />
      </div>

      {/* Insights */}
      <div className="space-y-3 mb-6">
        {INSIGHTS.map((insight, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-4 rounded-xl border ${
              insight.severity === "high"
                ? "bg-red-500/10 border-red-500/30"
                : insight.severity === "medium"
                ? "bg-yellow-500/10 border-yellow-500/30"
                : "bg-emerald-500/10 border-emerald-500/30"
            }`}
          >
            <AlertTriangle
              size={16}
              className={`shrink-0 mt-0.5 ${
                insight.severity === "high" ? "text-red-400" : insight.severity === "medium" ? "text-yellow-400" : "text-emerald-400"
              }`}
            />
            <p className={`text-sm ${
              insight.severity === "high" ? "text-red-200" : insight.severity === "medium" ? "text-yellow-200" : "text-emerald-200"
            }`}>
              {insight.message}
            </p>
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="dashboard-card overflow-x-auto">
        <p className="text-sm font-medium text-white mb-4">競合比較テーブル（Google Maps 検索順位）</p>
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-[#2A2A3E]">
              <th className="text-left pb-3 font-medium">順位</th>
              <th className="text-left pb-3 font-medium">サロン名</th>
              <th className="text-left pb-3 font-medium">評価</th>
              <th className="text-left pb-3 font-medium">口コミ数</th>
              <th className="text-left pb-3 font-medium">写真数</th>
              <th className="text-left pb-3 font-medium">投稿数/月</th>
              <th className="text-left pb-3 font-medium">アクション</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E1E2E]">
            {COMPETITORS.map((c) => (
              <tr key={c.name} className={`${c.isSelf ? "bg-gold/5" : "hover:bg-[#1A1A2A]"} transition-colors`}>
                <td className="py-3 pr-4">
                  <span className={`text-lg font-bold ${c.isSelf ? "text-gold" : "text-white"}`}>
                    #{c.rank}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <p className={`text-sm font-medium ${c.isSelf ? "text-gold" : "text-white"}`}>
                    {c.name} {c.isSelf && <span className="text-xs text-gold-light ml-1">自社</span>}
                  </p>
                  <p className="text-xs text-gray-500">{c.area}</p>
                </td>
                <td className="py-3 pr-4">
                  <span className="text-sm text-yellow-400">★ {c.rating}</span>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-300">{c.reviewCount}</span>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-1">
                    <span className={`text-sm ${c.isSelf && c.photoCount < 30 ? "text-red-400" : "text-gray-300"}`}>
                      {c.photoCount}
                    </span>
                    {c.isSelf && c.photoCount < 30 && <span className="text-xs text-red-400">要追加</span>}
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <span className="text-sm text-gray-300">{c.postCount}</span>
                </td>
                <td className="py-3">
                  {!c.isSelf && (
                    <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-white">
                      <Eye size={12} />詳細
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Plan */}
      <div className="dashboard-card mt-6">
        <p className="text-sm font-medium text-white mb-3">AI 提案アクションプラン</p>
        <div className="space-y-2">
          {[
            { num: 1, action: "今週中に写真を8枚追加し、合計30枚に到達させる（MEO スタジオへ）", link: "/dashboard/image-studio" },
            { num: 2, action: "口コミ促進QRコードを作成・店頭設置（目標: 今月+10件）", link: "/dashboard/meo" },
            { num: 3, action: "投稿頻度を週3回→週5回に増加（Content Hub でスケジュール）", link: "/dashboard/content-hub" },
          ].map((item) => (
            <div key={item.num} className="flex items-center gap-3 p-3 bg-[#12121A] rounded-lg">
              <span className="w-6 h-6 bg-gold/20 text-gold text-xs rounded-full flex items-center justify-center shrink-0">{item.num}</span>
              <p className="text-sm text-gray-300 flex-1">{item.action}</p>
              <a href={item.link} className="text-xs text-gold hover:text-gold-light shrink-0">実行 →</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
