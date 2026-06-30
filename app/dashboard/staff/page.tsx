"use client";
import { useState } from "react";
import { Users, Star, Scissors, TrendingUp, Award, Calendar, ChevronDown, ChevronUp } from "lucide-react";

type Staff = {
  id: string;
  name: string;
  role: string;
  experience: number;
  specialties: string[];
  monthlyBookings: number;
  repeatRate: number;
  avgRating: number;
  sales: number;
  schedule: Record<string, string>;
  achievements: string[];
  bio: string;
};

const STAFF: Staff[] = [
  {
    id: "1",
    name: "田中 雄介",
    role: "代表スタイリスト",
    experience: 12,
    specialties: ["縮毛矯正", "髪質改善TR", "カット"],
    monthlyBookings: 52,
    repeatRate: 89,
    avgRating: 4.9,
    sales: 936000,
    schedule: { 月: "出勤", 火: "定休", 水: "出勤", 木: "出勤", 金: "出勤", 土: "出勤", 日: "出勤" },
    achievements: ["縮毛矯正スペシャリスト認定", "月間売上1位 (3ヶ月連続)"],
    bio: "髪質改善専門の技術を持ち、特に縮毛矯正でのリピート率が高い。",
  },
  {
    id: "2",
    name: "佐藤 花",
    role: "カラースペシャリスト",
    experience: 7,
    specialties: ["カラー", "ハイライト", "パーマ"],
    monthlyBookings: 38,
    repeatRate: 82,
    avgRating: 4.7,
    sales: 684000,
    schedule: { 月: "出勤", 火: "出勤", 水: "出勤", 木: "定休", 金: "出勤", 土: "出勤", 日: "出勤" },
    achievements: ["ハイライト技術認定", "新規顧客転換率No.1"],
    bio: "トレンドカラーを中心に、お客様の骨格に合った提案が得意。",
  },
  {
    id: "3",
    name: "山田 凛",
    role: "スタイリスト",
    experience: 4,
    specialties: ["カット", "パーマ", "スタイリング"],
    monthlyBookings: 29,
    repeatRate: 74,
    avgRating: 4.5,
    sales: 435000,
    schedule: { 月: "出勤", 火: "出勤", 水: "定休", 木: "出勤", 金: "出勤", 土: "出勤", 日: "出勤" },
    achievements: ["カット技術コンテスト入賞"],
    bio: "トレンドを取り入れたカットスタイルを提案。若いお客様に人気。",
  },
];

const WEEK_DAYS = ["月", "火", "水", "木", "金", "土", "日"];

function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="w-full bg-[#2A2A3E] rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
    </div>
  );
}

export default function StaffPage() {
  const [expanded, setExpanded] = useState<string | null>("1");

  const totalSales = STAFF.reduce((s, st) => s + st.sales, 0);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Users size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">Staff Management</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">スタッフ管理</h1>
        <p className="text-sm text-gray-500 mt-1">スタッフ{STAFF.length}名 · 月間売上合計 ¥{(totalSales / 10000).toFixed(0)}万円</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {STAFF.map((s) => (
          <div key={s.id} className="dashboard-card text-center">
            <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-2 text-gold font-bold">
              {s.name[0]}
            </div>
            <p className="text-sm font-medium text-white">{s.name}</p>
            <p className="text-xs text-gray-500 mb-3">{s.role}</p>
            <div className="grid grid-cols-2 gap-1 text-center">
              <div><p className="text-sm font-bold text-gold">{s.monthlyBookings}</p><p className="text-[10px] text-gray-600">月予約数</p></div>
              <div><p className="text-sm font-bold text-gold">★{s.avgRating}</p><p className="text-[10px] text-gray-600">評価</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail cards */}
      <div className="space-y-3">
        {STAFF.map((s) => (
          <div key={s.id} className="dashboard-card">
            <button
              className="w-full flex items-center justify-between"
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm">
                  {s.name[0]}
                </div>
                <div className="text-left">
                  <p className="text-white font-medium">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.role} · 経験{s.experience}年</p>
                </div>
                <div className="flex gap-2 ml-4">
                  {s.specialties.map((sp) => (
                    <span key={sp} className="text-[10px] px-2 py-0.5 bg-gold/10 border border-gold/20 text-gold rounded-full">{sp}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div className="hidden sm:block">
                  <p className="text-sm font-bold text-white">¥{(s.sales / 10000).toFixed(0)}万</p>
                  <p className="text-[10px] text-gray-500">月間売上</p>
                </div>
                {expanded === s.id ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
              </div>
            </button>

            {expanded === s.id && (
              <div className="mt-4 pt-4 border-t border-[#2A2A3E] grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* KPIs */}
                <div className="space-y-3">
                  <p className="text-xs text-gold uppercase tracking-widest">パフォーマンス</p>
                  {[
                    { label: "月間予約数", value: `${s.monthlyBookings}件`, bar: s.monthlyBookings, max: 60, color: "bg-blue-500" },
                    { label: "リピート率", value: `${s.repeatRate}%`, bar: s.repeatRate, max: 100, color: "bg-emerald-500" },
                    { label: "平均評価", value: `★${s.avgRating}`, bar: s.avgRating * 20, max: 100, color: "bg-gold" },
                    { label: "月間売上", value: `¥${(s.sales / 10000).toFixed(0)}万`, bar: (s.sales / 10000), max: 100, color: "bg-purple-500" },
                  ].map((kpi) => (
                    <div key={kpi.label}>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">{kpi.label}</span>
                        <span className="text-white font-medium">{kpi.value}</span>
                      </div>
                      <StatBar value={kpi.bar} max={kpi.max} color={kpi.color} />
                    </div>
                  ))}
                </div>

                {/* Schedule */}
                <div>
                  <p className="text-xs text-gold uppercase tracking-widest mb-3">今週のシフト</p>
                  <div className="grid grid-cols-7 gap-1">
                    {WEEK_DAYS.map((day) => {
                      const status = s.schedule[day];
                      return (
                        <div key={day} className="text-center">
                          <p className="text-[10px] text-gray-500 mb-1">{day}</p>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] mx-auto ${status === "定休" ? "bg-[#12121A] text-gray-600" : "bg-emerald-500/20 text-emerald-400"}`}>
                            {status === "定休" ? "休" : "出"}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-gold uppercase tracking-widest mt-4 mb-2">実績・認定</p>
                  {s.achievements.map((a) => (
                    <div key={a} className="flex items-center gap-2 mb-1">
                      <Award size={11} className="text-gold shrink-0" />
                      <p className="text-xs text-gray-400">{a}</p>
                    </div>
                  ))}
                </div>

                {/* Bio */}
                <div>
                  <p className="text-xs text-gold uppercase tracking-widest mb-2">プロフィール</p>
                  <p className="text-sm text-gray-400 leading-relaxed">{s.bio}</p>
                  <div className="mt-4 space-y-1">
                    <p className="text-xs text-gray-600">得意メニュー</p>
                    <div className="flex flex-wrap gap-1">
                      {s.specialties.map((sp) => (
                        <span key={sp} className="flex items-center gap-1 text-xs text-gray-300 bg-[#12121A] px-2 py-1 rounded-lg">
                          <Scissors size={10} className="text-gold" />{sp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
