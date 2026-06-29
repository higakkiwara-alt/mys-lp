"use client";
import Link from "next/link";
import {
  Star, MessageCircle, Camera, Mic, TrendingUp,
  Users, DollarSign, BookOpen, Zap, ChevronRight
} from "lucide-react";
import { useState } from "react";

const QUICK_ACTIONS = [
  {
    icon: Star,
    label: "口コミ返信",
    desc: "新着レビューにAI返信",
    href: "/dashboard/reviews",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    badge: "3件",
  },
  {
    icon: Mic,
    label: "音声 → SNS",
    desc: "今日の施術を録音して投稿",
    href: "/dashboard/stylist-brain",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    badge: null,
  },
  {
    icon: Camera,
    label: "画像生成",
    desc: "Before/After 自動加工",
    href: "/dashboard/image-studio",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
    badge: null,
  },
  {
    icon: MessageCircle,
    label: "問い合わせ返信",
    desc: "DM・LINEにAI即返信",
    href: "/dashboard/sales-closer",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    badge: "5件",
  },
  {
    icon: TrendingUp,
    label: "MEO チェック",
    desc: "Google順位・競合確認",
    href: "/dashboard/meo/dominator",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    badge: null,
  },
  {
    icon: Users,
    label: "失客リスト",
    desc: "再来店促進メッセージ",
    href: "/dashboard/retention",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    badge: "12名",
  },
  {
    icon: DollarSign,
    label: "空き枠セール",
    desc: "今日の空き時間を確認",
    href: "/dashboard/pricing",
    color: "text-gold",
    bg: "bg-gold/10",
    border: "border-gold/20",
    badge: null,
  },
  {
    icon: BookOpen,
    label: "スタッフ研修",
    desc: "AIに質問・教材確認",
    href: "/dashboard/training",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    badge: null,
  },
];

const TODAY_STATS = [
  { label: "本日の予約", value: "8名" },
  { label: "空き枠", value: "3枠" },
  { label: "未読DM", value: "5件" },
  { label: "新着口コミ", value: "3件" },
];

export default function QuickPage() {
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  const saveNote = () => {
    if (!note.trim()) return;
    setSaved(true);
    setTimeout(() => { setSaved(false); setNote(""); }, 2000);
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" });

  return (
    <div className="p-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={14} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">Quick Actions</p>
        </div>
        <h1 className="text-xl font-semibold text-white">{dateStr} {timeStr}</h1>
        <p className="text-xs text-gray-500 mt-0.5">今日やること · スタッフ用クイック操作</p>
      </div>

      {/* Today stats */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {TODAY_STATS.map((s) => (
          <div key={s.label} className="dashboard-card !p-3 text-center">
            <p className="text-lg font-bold text-gold">{s.value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick action grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={`flex items-center gap-4 p-4 rounded-xl border ${action.bg} ${action.border} hover:opacity-90 transition-opacity group`}
          >
            <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center shrink-0`}>
              <action.icon size={18} className={action.color} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white">{action.label}</p>
                {action.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-red-500 text-white rounded-full font-medium">
                    {action.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{action.desc}</p>
            </div>
            <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 shrink-0" />
          </Link>
        ))}
      </div>

      {/* Quick note */}
      <div className="dashboard-card">
        <p className="text-xs text-gold tracking-widest uppercase mb-3">メモ（音声→テキスト予定）</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="今日の施術メモ・気づき・申し送り事項を入力..."
          rows={4}
          className="w-full bg-[#12121A] border border-[#2A2A3E] rounded-lg p-3 text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-gold/50"
        />
        <button
          onClick={saveNote}
          className="mt-2 w-full py-2 bg-gold/10 border border-gold/30 rounded-lg text-gold text-sm hover:bg-gold/20 transition-all"
        >
          {saved ? "✓ 保存しました" : "メモを保存"}
        </button>
      </div>
    </div>
  );
}
