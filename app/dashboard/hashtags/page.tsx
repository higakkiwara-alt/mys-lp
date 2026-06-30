"use client";
import { useState } from "react";
import { Hash, TrendingUp, Eye, Heart, BarChart2, Search, Copy, Check } from "lucide-react";

type HashtagData = {
  tag: string;
  posts: number;
  reach: number;
  engagement: number;
  trend: "up" | "down" | "stable";
  category: string;
};

const HASHTAGS: HashtagData[] = [
  { tag: "#縮毛矯正", posts: 2840000, reach: 12400, engagement: 4.8, trend: "up", category: "メニュー" },
  { tag: "#立川美容室", posts: 48200, reach: 3200, engagement: 6.2, trend: "up", category: "エリア" },
  { tag: "#髪質改善", posts: 1920000, reach: 8900, engagement: 4.1, trend: "up", category: "メニュー" },
  { tag: "#縮毛矯正専門店", posts: 124000, reach: 5600, engagement: 5.9, trend: "stable", category: "メニュー" },
  { tag: "#立川ヘアサロン", posts: 31500, reach: 2800, engagement: 7.1, trend: "up", category: "エリア" },
  { tag: "#ハイライト", posts: 3210000, reach: 15800, engagement: 3.9, trend: "stable", category: "メニュー" },
  { tag: "#ヘアカラー", posts: 8940000, reach: 22000, engagement: 3.2, trend: "down", category: "メニュー" },
  { tag: "#美容室立川", posts: 27800, reach: 2400, engagement: 6.8, trend: "up", category: "エリア" },
  { tag: "#くせ毛改善", posts: 412000, reach: 6100, engagement: 5.3, trend: "up", category: "悩み" },
  { tag: "#梅雨ヘア", posts: 89000, reach: 4300, engagement: 5.7, trend: "up", category: "季節" },
  { tag: "#夏ヘア", posts: 1240000, reach: 9800, engagement: 4.4, trend: "up", category: "季節" },
  { tag: "#パーマ", posts: 4120000, reach: 18200, engagement: 3.6, trend: "stable", category: "メニュー" },
  { tag: "#サラサラヘア", posts: 678000, reach: 7200, engagement: 5.1, trend: "up", category: "悩み" },
  { tag: "#ビフォーアフター", posts: 2890000, reach: 16400, engagement: 4.6, trend: "stable", category: "コンテンツ" },
  { tag: "#ヘアケア", posts: 5340000, reach: 24000, engagement: 3.4, trend: "stable", category: "コンテンツ" },
  { tag: "#美容師", posts: 6210000, reach: 28000, engagement: 3.1, trend: "down", category: "その他" },
];

const CATEGORY_COLORS: Record<string, string> = {
  "メニュー": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "エリア": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "悩み": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "季節": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "コンテンツ": "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "その他": "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const RECOMMENDED_SETS = [
  {
    label: "縮毛矯正投稿セット",
    tags: ["#縮毛矯正", "#縮毛矯正専門店", "#髪質改善", "#くせ毛改善", "#立川美容室", "#サラサラヘア", "#ビフォーアフター"],
  },
  {
    label: "カラー投稿セット",
    tags: ["#ハイライト", "#ヘアカラー", "#ビフォーアフター", "#立川ヘアサロン", "#美容室立川", "#夏ヘア"],
  },
  {
    label: "エリアSEOセット",
    tags: ["#立川美容室", "#立川ヘアサロン", "#美容室立川", "#縮毛矯正", "#髪質改善"],
  },
];

function formatNum(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

export default function HashtagsPage() {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [sortBy, setSortBy] = useState<"engagement" | "reach" | "posts">("engagement");
  const [copied, setCopied] = useState<string | null>(null);

  const categories = ["all", ...Array.from(new Set(HASHTAGS.map((h) => h.category)))];

  const filtered = HASHTAGS
    .filter((h) => {
      if (search && !h.tag.includes(search)) return false;
      if (filterCat !== "all" && h.category !== filterCat) return false;
      return true;
    })
    .sort((a, b) => b[sortBy] - a[sortBy]);

  const copySet = (tags: string[]) => {
    navigator.clipboard.writeText(tags.join(" "));
    const key = tags[0];
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const avgEngagement = (HASHTAGS.reduce((s, h) => s + h.engagement, 0) / HASHTAGS.length).toFixed(1);
  const topTag = [...HASHTAGS].sort((a, b) => b.engagement - a.engagement)[0];

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Hash size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">Hashtag Analytics</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">ハッシュタグ分析</h1>
        <p className="text-sm text-gray-500 mt-1">Instagram投稿に最適なハッシュタグを分析・管理</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "追跡タグ数", value: `${HASHTAGS.length}個`, icon: Hash, color: "text-blue-400" },
          { label: "平均エンゲージメント", value: `${avgEngagement}%`, icon: Heart, color: "text-pink-400" },
          { label: "最高リーチタグ", value: topTag.tag, icon: Eye, color: "text-gold" },
          { label: "急上昇タグ", value: `${HASHTAGS.filter((h) => h.trend === "up").length}個`, icon: TrendingUp, color: "text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="dashboard-card flex items-center gap-3">
            <s.icon size={18} className={s.color} />
            <div>
              <p className="text-sm font-bold text-white truncate">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recommended sets */}
      <div className="mb-8">
        <p className="text-xs text-gold uppercase tracking-widest mb-3">推奨セット（ワンクリックでコピー）</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {RECOMMENDED_SETS.map((set) => (
            <div key={set.label} className="dashboard-card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-white">{set.label}</p>
                <button
                  onClick={() => copySet(set.tags)}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 bg-gold/10 border border-gold/30 text-gold rounded-lg hover:bg-gold/20"
                >
                  {copied === set.tags[0] ? <Check size={10} /> : <Copy size={10} />}
                  {copied === set.tags[0] ? "コピー済" : "コピー"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {set.tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-[#12121A] text-blue-400 rounded">{tag}</span>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 mt-2">{set.tags.length}個 · 投稿時にそのまま貼り付け</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="タグを検索..."
            className="bg-[#1E1E2E] border border-[#2A2A3E] rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold/50"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="bg-[#1E1E2E] border border-[#2A2A3E] rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-gold/50"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c === "all" ? "カテゴリ: 全て" : c}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="bg-[#1E1E2E] border border-[#2A2A3E] rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-gold/50"
        >
          <option value="engagement">エンゲージメント順</option>
          <option value="reach">リーチ順</option>
          <option value="posts">投稿数順</option>
        </select>
      </div>

      {/* Table */}
      <div className="dashboard-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2A2A3E]">
              {["ハッシュタグ", "カテゴリ", "投稿数", "予想リーチ", "エンゲージメント", "トレンド"].map((h) => (
                <th key={h} className="text-left text-[10px] text-gray-500 uppercase tracking-widest pb-3 pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2A3E]">
            {filtered.map((h) => (
              <tr key={h.tag} className="group hover:bg-white/2">
                <td className="py-3 pr-4">
                  <span className="text-sm text-blue-400 font-medium">{h.tag}</span>
                </td>
                <td className="py-3 pr-4">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[h.category]}`}>{h.category}</span>
                </td>
                <td className="py-3 pr-4 text-sm text-gray-400">{formatNum(h.posts)}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-[#2A2A3E] rounded-full h-1">
                      <div className="h-1 rounded-full bg-gold" style={{ width: `${(h.reach / 28000) * 100}%` }} />
                    </div>
                    <span className="text-sm text-gray-400">{formatNum(h.reach)}</span>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <span className={`text-sm font-medium ${h.engagement >= 5 ? "text-emerald-400" : h.engagement >= 4 ? "text-yellow-400" : "text-gray-400"}`}>
                    {h.engagement}%
                  </span>
                </td>
                <td className="py-3">
                  <span className={`text-xs flex items-center gap-1 ${h.trend === "up" ? "text-emerald-400" : h.trend === "down" ? "text-red-400" : "text-gray-500"}`}>
                    {h.trend === "up" ? "↑ 上昇" : h.trend === "down" ? "↓ 下降" : "→ 横ばい"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
