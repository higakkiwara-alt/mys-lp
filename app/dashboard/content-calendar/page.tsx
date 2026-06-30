"use client";
import { useState } from "react";
import { CalendarDays, Instagram, Globe, FileText, MessageCircle, Plus, CheckCircle2, Clock, Edit3 } from "lucide-react";

type ContentItem = {
  id: string;
  date: string;
  type: "instagram" | "google" | "blog" | "line";
  title: string;
  status: "draft" | "scheduled" | "posted";
  tags: string[];
};

const PLATFORM_CONFIG = {
  instagram: { label: "Instagram", icon: Instagram, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
  google: { label: "Google", icon: Globe, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  blog: { label: "ブログ", icon: FileText, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  line: { label: "LINE", icon: MessageCircle, color: "text-[#06C755]", bg: "bg-[#06C755]/10", border: "border-[#06C755]/20" },
};

const STATUS_CONFIG = {
  draft: { label: "下書き", cls: "text-gray-400 bg-gray-500/10" },
  scheduled: { label: "予約済み", cls: "text-yellow-400 bg-yellow-500/10" },
  posted: { label: "投稿済み", cls: "text-emerald-400 bg-emerald-500/10" },
};

const INITIAL_CONTENT: ContentItem[] = [
  { id: "1", date: "2026-06-29", type: "instagram", title: "縮毛矯正ビフォーアフター｜夏のサラサラヘア", status: "scheduled", tags: ["#縮毛矯正", "#立川美容室"] },
  { id: "2", date: "2026-06-29", type: "google", title: "口コミ返信 & 週次投稿", status: "scheduled", tags: [] },
  { id: "3", date: "2026-07-01", type: "blog", title: "【2026年版】縮毛矯正の選び方・失敗しない5つのポイント", status: "draft", tags: ["縮毛矯正", "立川", "SEO"] },
  { id: "4", date: "2026-07-01", type: "line", title: "7月キャンペーンのお知らせ（全顧客配信）", status: "draft", tags: [] },
  { id: "5", date: "2026-07-03", type: "instagram", title: "スタッフ紹介｜田中スタイリストの得意技術", status: "draft", tags: ["#スタッフ紹介", "#ヘアサロン"] },
  { id: "6", date: "2026-07-05", type: "instagram", title: "ハイライトカラー施術動画（リール）", status: "draft", tags: ["#ハイライト", "#ヘアカラー"] },
  { id: "7", date: "2026-07-07", type: "blog", title: "髪質改善トリートメントとは？縮毛矯正との違いを徹底解説", status: "draft", tags: ["髪質改善", "SEO"] },
  { id: "8", date: "2026-07-08", type: "google", title: "夏の髪質改善キャンペーン投稿", status: "draft", tags: [] },
  { id: "9", date: "2026-06-25", type: "instagram", title: "梅雨対策ヘアケア特集", status: "posted", tags: ["#梅雨", "#ヘアケア"] },
  { id: "10", date: "2026-06-22", type: "blog", title: "立川でおすすめの縮毛矯正サロン｜Mysスタイル紹介", status: "posted", tags: ["縮毛矯正", "立川"] },
];

const WEEK_DAYS = ["日", "月", "火", "水", "木", "金", "土"];

function getWeekDates(base: Date) {
  const day = base.getDay();
  const mon = new Date(base);
  mon.setDate(base.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export default function ContentCalendarPage() {
  const today = new Date(2026, 5, 29);
  const [weekBase, setWeekBase] = useState(today);
  const [content, setContent] = useState<ContentItem[]>(INITIAL_CONTENT);
  const [filter, setFilter] = useState<string>("all");

  const weekDates = getWeekDates(weekBase);
  const todayIso = today.toISOString().slice(0, 10);

  const prevWeek = () => { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d); };
  const nextWeek = () => { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d); };

  const filtered = content.filter((c) => filter === "all" || c.type === filter);

  const stats = {
    total: content.length,
    posted: content.filter((c) => c.status === "posted").length,
    scheduled: content.filter((c) => c.status === "scheduled").length,
    draft: content.filter((c) => c.status === "draft").length,
  };

  const updateStatus = (id: string, status: ContentItem["status"]) => {
    setContent((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
  };

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays size={16} className="text-gold" />
            <p className="text-xs text-gold tracking-widest uppercase">Content Calendar</p>
          </div>
          <h1 className="text-2xl font-semibold text-white">コンテンツカレンダー</h1>
          <p className="text-sm text-gray-500 mt-1">SNS・ブログ・LINE の投稿を一元管理</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/30 rounded-lg text-gold text-sm hover:bg-gold/20">
          <Plus size={14} />新規追加
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "総コンテンツ", value: stats.total, icon: CalendarDays, color: "text-blue-400" },
          { label: "投稿済み", value: stats.posted, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "予約済み", value: stats.scheduled, icon: Clock, color: "text-yellow-400" },
          { label: "下書き", value: stats.draft, icon: Edit3, color: "text-gray-400" },
        ].map((s) => (
          <div key={s.label} className="dashboard-card flex items-center gap-3">
            <s.icon size={16} className={s.color} />
            <div>
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Platform filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs transition-all ${filter === "all" ? "bg-gold/20 text-gold border border-gold/30" : "bg-[#1E1E2E] text-gray-400 border border-[#2A2A3E]"}`}>
          すべて
        </button>
        {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${filter === key ? `${cfg.bg} ${cfg.color} border ${cfg.border}` : "bg-[#1E1E2E] text-gray-400 border border-[#2A2A3E]"}`}>
            <cfg.icon size={11} />{cfg.label}
          </button>
        ))}
      </div>

      {/* Weekly view */}
      <div className="dashboard-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400"><CalendarDays size={14} />←</button>
          <p className="text-sm text-white font-medium">{weekDates[0]} 〜 {weekDates[6]}</p>
          <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400">→<CalendarDays size={14} /></button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, i) => {
            const dayContent = filtered.filter((c) => c.date === date);
            return (
              <div key={date} className={`min-h-[100px] rounded-xl p-2 ${date === todayIso ? "bg-gold/5 border border-gold/20" : "bg-[#12121A] border border-[#2A2A3E]"}`}>
                <p className={`text-[10px] font-medium mb-2 ${date === todayIso ? "text-gold" : i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"}`}>
                  {WEEK_DAYS[i]} {date.slice(8)}
                </p>
                <div className="space-y-1">
                  {dayContent.map((c) => {
                    const cfg = PLATFORM_CONFIG[c.type];
                    return (
                      <div key={c.id} className={`p-1.5 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                        <cfg.icon size={9} className={`${cfg.color} mb-0.5`} />
                        <p className={`text-[9px] leading-tight ${cfg.color} truncate`}>{c.title}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.sort((a, b) => a.date.localeCompare(b.date)).map((item) => {
          const cfg = PLATFORM_CONFIG[item.type];
          const sCfg = STATUS_CONFIG[item.status];
          return (
            <div key={item.id} className="flex items-center gap-4 p-4 bg-[#1E1E2E] border border-[#2A2A3E] rounded-xl hover:border-gold/20 transition-colors">
              <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                <cfg.icon size={14} className={cfg.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{item.title}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-500">{item.date}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${sCfg.cls}`}>{sCfg.label}</span>
                  {item.tags.map((tag) => <span key={tag} className="text-[10px] text-blue-400">{tag}</span>)}
                </div>
              </div>
              <div className="flex gap-1.5">
                {item.status === "draft" && (
                  <button onClick={() => updateStatus(item.id, "scheduled")}
                    className="px-2 py-1 text-[10px] bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/20">
                    予約
                  </button>
                )}
                {item.status === "scheduled" && (
                  <button onClick={() => updateStatus(item.id, "posted")}
                    className="px-2 py-1 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/20">
                    投稿
                  </button>
                )}
                {item.status === "posted" && (
                  <span className="px-2 py-1 text-[10px] text-emerald-400"><CheckCircle2 size={12} className="inline" /> 完了</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
