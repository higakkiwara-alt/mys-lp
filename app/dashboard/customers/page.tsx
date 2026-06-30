"use client";
import { useState } from "react";
import { Users, Search, Filter, Star, Heart, TrendingUp, Calendar, Phone, ChevronRight, Tag } from "lucide-react";

type Customer = {
  id: string;
  name: string;
  kana: string;
  phone: string;
  visits: number;
  ltv: number;
  lastVisit: string;
  nextVisit?: string;
  tags: string[];
  risk: "high" | "medium" | "low";
  menu: string;
  stylist: string;
  rating?: number;
};

const CUSTOMERS: Customer[] = [
  { id: "1", name: "田中 美咲", kana: "タナカ ミサキ", phone: "090-1234-5678", visits: 18, ltv: 324000, lastVisit: "2026-06-20", nextVisit: "2026-07-18", tags: ["VIP", "縮毛矯正"], risk: "low", menu: "縮毛矯正+カット", stylist: "田中", rating: 5 },
  { id: "2", name: "鈴木 陽子", kana: "スズキ ヨウコ", phone: "080-2345-6789", visits: 12, ltv: 196000, lastVisit: "2026-04-15", tags: ["失客リスク", "髪質改善"], risk: "high", menu: "髪質改善TR+カラー", stylist: "佐藤", rating: 4 },
  { id: "3", name: "佐藤 花", kana: "サトウ ハナ", phone: "070-3456-7890", visits: 6, ltv: 84000, lastVisit: "2026-05-30", nextVisit: "2026-07-01", tags: ["新規"], risk: "medium", menu: "カット+カラー", stylist: "山田" },
  { id: "4", name: "伊藤 愛", kana: "イトウ アイ", phone: "090-4567-8901", visits: 24, ltv: 456000, lastVisit: "2026-06-25", nextVisit: "2026-07-23", tags: ["VIP", "長期"], risk: "low", menu: "縮毛矯正フル", stylist: "田中", rating: 5 },
  { id: "5", name: "山本 理沙", kana: "ヤマモト リサ", phone: "080-5678-9012", visits: 3, ltv: 38000, lastVisit: "2026-03-10", tags: ["失客リスク"], risk: "high", menu: "カット", stylist: "山田" },
  { id: "6", name: "中村 奈々", kana: "ナカムラ ナナ", phone: "070-6789-0123", visits: 9, ltv: 153000, lastVisit: "2026-06-01", nextVisit: "2026-07-29", tags: ["カラー定期"], risk: "medium", menu: "ハイライト+TR", stylist: "佐藤", rating: 5 },
  { id: "7", name: "小林 七海", kana: "コバヤシ ナナミ", phone: "090-7890-1234", visits: 15, ltv: 270000, lastVisit: "2026-06-18", tags: ["VIP"], risk: "low", menu: "パーマ+カット", stylist: "田中", rating: 4 },
  { id: "8", name: "加藤 莉子", kana: "カトウ リコ", phone: "080-8901-2345", visits: 2, ltv: 22000, lastVisit: "2026-02-20", tags: ["失客リスク", "新規"], risk: "high", menu: "カット", stylist: "山田" },
];

const TAG_COLORS: Record<string, string> = {
  "VIP": "bg-gold/20 text-gold border-gold/30",
  "失客リスク": "bg-red-500/20 text-red-400 border-red-500/30",
  "縮毛矯正": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "髪質改善": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "新規": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "長期": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "カラー定期": "bg-pink-500/20 text-pink-400 border-pink-500/30",
};

const RISK_CONFIG = {
  high: { label: "要フォロー", cls: "text-red-400 bg-red-500/10" },
  medium: { label: "注意", cls: "text-yellow-400 bg-yellow-500/10" },
  low: { label: "安定", cls: "text-emerald-400 bg-emerald-500/10" },
};

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<string | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [sortBy, setSortBy] = useState<"ltv" | "visits" | "lastVisit">("ltv");

  const filtered = CUSTOMERS
    .filter((c) => {
      if (search && !c.name.includes(search) && !c.kana.includes(search) && !c.phone.includes(search)) return false;
      if (filterTag && !c.tags.includes(filterTag)) return false;
      if (filterRisk && c.risk !== filterRisk) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "ltv") return b.ltv - a.ltv;
      if (sortBy === "visits") return b.visits - a.visits;
      return b.lastVisit.localeCompare(a.lastVisit);
    });

  const totalLtv = CUSTOMERS.reduce((s, c) => s + c.ltv, 0);
  const highRisk = CUSTOMERS.filter((c) => c.risk === "high").length;
  const vip = CUSTOMERS.filter((c) => c.tags.includes("VIP")).length;

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-gold" />
            <p className="text-xs text-gold tracking-widest uppercase">Customer CRM</p>
          </div>
          <h1 className="text-2xl font-semibold text-white">顧客管理</h1>
          <p className="text-sm text-gray-500 mt-1">全{CUSTOMERS.length}名 · LTV合計 ¥{(totalLtv / 10000).toFixed(0)}万円</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "総顧客数", value: `${CUSTOMERS.length}名`, icon: Users, color: "text-blue-400" },
          { label: "VIP顧客", value: `${vip}名`, icon: Star, color: "text-gold" },
          { label: "失客リスク", value: `${highRisk}名`, icon: Heart, color: "text-red-400" },
          { label: "平均LTV", value: `¥${Math.round(totalLtv / CUSTOMERS.length / 1000)}k`, icon: TrendingUp, color: "text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="dashboard-card flex items-center gap-3">
            <s.icon size={18} className={s.color} />
            <div>
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2 space-y-3">
          {/* Search & Filter */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="氏名・フリガナ・電話番号で検索"
                className="w-full bg-[#1E1E2E] border border-[#2A2A3E] rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold/50"
              />
            </div>
            <select
              value={filterRisk ?? ""}
              onChange={(e) => setFilterRisk(e.target.value || null)}
              className="bg-[#1E1E2E] border border-[#2A2A3E] rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-gold/50"
            >
              <option value="">リスク: 全て</option>
              <option value="high">要フォロー</option>
              <option value="medium">注意</option>
              <option value="low">安定</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-[#1E1E2E] border border-[#2A2A3E] rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-gold/50"
            >
              <option value="ltv">LTV順</option>
              <option value="visits">来店回数順</option>
              <option value="lastVisit">最終来店順</option>
            </select>
          </div>

          <div className="space-y-2">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${selected?.id === c.id ? "bg-gold/10 border-gold/30" : "bg-[#1E1E2E] border-[#2A2A3E] hover:border-gold/20"}`}
              >
                <div className="w-10 h-10 rounded-full bg-[#2A2A3E] flex items-center justify-center text-white font-medium text-sm shrink-0">
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-white truncate">{c.name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${RISK_CONFIG[c.risk].cls}`}>
                      {RISK_CONFIG[c.risk].label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{c.visits}回来店</span>
                    <span>¥{c.ltv.toLocaleString()}</span>
                    <span>最終: {c.lastVisit}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {c.tags.map((tag) => (
                      <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded border ${TAG_COLORS[tag] ?? "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight size={14} className="text-gray-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="dashboard-card h-fit sticky top-6">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold">
                  {selected.name[0]}
                </div>
                <div>
                  <p className="text-white font-semibold">{selected.name}</p>
                  <p className="text-xs text-gray-500">{selected.kana}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <Phone size={13} className="text-gray-600" />
                  {selected.phone}
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Calendar size={13} className="text-gray-600" />
                  最終来店: {selected.lastVisit}
                </div>
                {selected.nextVisit && (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Calendar size={13} />
                    次回予約: {selected.nextVisit}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "来店回数", value: `${selected.visits}回` },
                  { label: "LTV", value: `¥${selected.ltv.toLocaleString()}` },
                  { label: "担当", value: selected.stylist },
                  { label: "評価", value: selected.rating ? `★${selected.rating}` : "—" },
                ].map((s) => (
                  <div key={s.label} className="bg-[#12121A] rounded-lg p-2.5">
                    <p className="text-xs text-gray-600 mb-0.5">{s.label}</p>
                    <p className="text-sm text-white font-medium">{s.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs text-gray-600 mb-1.5">直近メニュー</p>
                <p className="text-sm text-gray-300 bg-[#12121A] rounded-lg px-3 py-2">{selected.menu}</p>
              </div>

              <div>
                <p className="text-xs text-gray-600 mb-1.5">タグ</p>
                <div className="flex flex-wrap gap-1">
                  {selected.tags.map((tag) => (
                    <span key={tag} className={`text-xs px-2 py-0.5 rounded border ${TAG_COLORS[tag] ?? "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
                      <Tag size={10} className="inline mr-1" />{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <a
                  href={`https://line.me/R/ti/p/${selected.phone}`}
                  className="flex-1 py-2 text-xs text-center bg-[#06C755]/10 border border-[#06C755]/30 text-[#06C755] rounded-lg hover:bg-[#06C755]/20"
                >
                  LINEを送る
                </a>
                <button className="flex-1 py-2 text-xs bg-gold/10 border border-gold/30 text-gold rounded-lg hover:bg-gold/20">
                  AI メッセージ生成
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users size={36} className="text-gray-700 mb-3" />
              <p className="text-sm text-gray-600">顧客を選択すると<br />詳細が表示されます</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
