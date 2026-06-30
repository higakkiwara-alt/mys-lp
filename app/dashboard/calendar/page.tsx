"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock, User, Scissors } from "lucide-react";

type Booking = { id: string; name: string; menu: string; stylist: string; time: string; duration: number; color: string };

const BOOKINGS: Record<string, Booking[]> = {
  "2026-06-29": [
    { id: "1", name: "田中 美咲", menu: "縮毛矯正+カット", stylist: "田中", time: "10:00", duration: 180, color: "bg-purple-500/20 border-purple-500/40 text-purple-300" },
    { id: "2", name: "鈴木 陽子", menu: "カラー+TR", stylist: "佐藤", time: "11:30", duration: 120, color: "bg-pink-500/20 border-pink-500/40 text-pink-300" },
    { id: "3", name: "佐藤 花", menu: "カット", stylist: "山田", time: "14:00", duration: 60, color: "bg-blue-500/20 border-blue-500/40 text-blue-300" },
    { id: "4", name: "伊藤 愛", menu: "髪質改善TR", stylist: "田中", time: "15:30", duration: 90, color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" },
  ],
  "2026-06-30": [
    { id: "5", name: "山本 理沙", menu: "カット+カラー", stylist: "佐藤", time: "09:00", duration: 120, color: "bg-pink-500/20 border-pink-500/40 text-pink-300" },
    { id: "6", name: "中村 奈々", menu: "縮毛矯正", stylist: "田中", time: "12:00", duration: 180, color: "bg-purple-500/20 border-purple-500/40 text-purple-300" },
    { id: "7", name: "小林 七海", menu: "パーマ+カット", stylist: "山田", time: "16:00", duration: 150, color: "bg-orange-500/20 border-orange-500/40 text-orange-300" },
  ],
  "2026-07-01": [
    { id: "8", name: "加藤 莉子", menu: "カット", stylist: "山田", time: "11:00", duration: 60, color: "bg-blue-500/20 border-blue-500/40 text-blue-300" },
    { id: "9", name: "渡辺 彩", menu: "ハイライト", stylist: "佐藤", time: "13:00", duration: 150, color: "bg-yellow-500/20 border-yellow-500/40 text-yellow-300" },
  ],
  "2026-07-03": [
    { id: "10", name: "松本 葵", menu: "縮毛矯正フル", stylist: "田中", time: "10:00", duration: 240, color: "bg-purple-500/20 border-purple-500/40 text-purple-300" },
    { id: "11", name: "井上 春", menu: "カット+TR", stylist: "山田", time: "15:00", duration: 90, color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" },
  ],
};

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];
const STYLISTS = [
  { name: "田中", color: "bg-purple-500" },
  { name: "佐藤", color: "bg-pink-500" },
  { name: "山田", color: "bg-blue-500" },
];

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const today = new Date(2026, 5, 29); // demo date
  const [currentMonth, setCurrentMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState(isoDate(today.getFullYear(), today.getMonth(), today.getDate()));
  const [view, setView] = useState<"month" | "day">("month");

  const { year, month } = currentMonth;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayIso = isoDate(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedBookings = BOOKINGS[selectedDate] ?? [];

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-gold" />
            <p className="text-xs text-gold tracking-widest uppercase">Booking Calendar</p>
          </div>
          <h1 className="text-2xl font-semibold text-white">予約カレンダー</h1>
          <p className="text-sm text-gray-500 mt-1">スタッフ別・メニュー別に予約を管理</p>
        </div>
        <div className="flex gap-2">
          {(["month", "day"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${view === v ? "bg-gold/20 text-gold border border-gold/30" : "bg-[#1E1E2E] text-gray-400 border border-[#2A2A3E]"}`}>
              {v === "month" ? "月表示" : "日表示"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="dashboard-card">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(({ year: y, month: m }) => m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 })}
                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white">
                <ChevronLeft size={16} />
              </button>
              <p className="text-white font-medium">{year}年{month + 1}月</p>
              <button onClick={() => setCurrentMonth(({ year: y, month: m }) => m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 })}
                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white">
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((d, i) => (
                <div key={d} className={`text-center text-xs py-1 font-medium ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"}`}>{d}</div>
              ))}
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const iso = isoDate(year, month, day);
                const count = (BOOKINGS[iso] ?? []).length;
                const isToday = iso === todayIso;
                const isSelected = iso === selectedDate;
                return (
                  <button key={i} onClick={() => { setSelectedDate(iso); setView("day"); }}
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all ${
                      isSelected ? "bg-gold text-white" : isToday ? "bg-gold/20 text-gold" : "hover:bg-white/5 text-gray-300"
                    }`}>
                    <span className={i % 7 === 0 ? "text-red-400" : i % 7 === 6 ? "text-blue-400" : ""}>{day}</span>
                    {count > 0 && (
                      <span className={`text-[9px] mt-0.5 ${isSelected ? "text-white/80" : "text-gold"}`}>{count}件</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Stylist legend */}
            <div className="flex gap-4 mt-4 pt-4 border-t border-[#2A2A3E]">
              {STYLISTS.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${s.color}`} />
                  <span className="text-xs text-gray-500">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Day detail */}
        <div className="dashboard-card h-fit">
          <p className="text-xs text-gold tracking-widest uppercase mb-3">{selectedDate}</p>
          {selectedBookings.length > 0 ? (
            <div className="space-y-3">
              {selectedBookings.map((b) => (
                <div key={b.id} className={`p-3 rounded-lg border ${b.color}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <Clock size={11} />{b.time}
                    </span>
                    <span className="text-[10px] opacity-70">{b.duration}分</span>
                  </div>
                  <p className="text-sm font-medium">{b.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] opacity-70">
                    <span className="flex items-center gap-1"><Scissors size={10} />{b.menu}</span>
                    <span className="flex items-center gap-1"><User size={10} />{b.stylist}</span>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-[#2A2A3E] text-xs text-gray-500 text-center">
                合計 {selectedBookings.length}件 ·{" "}
                空き: {8 - selectedBookings.length}枠
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Calendar size={28} className="text-gray-700 mb-2" />
              <p className="text-sm text-gray-600">この日の予約はありません</p>
              <p className="text-xs text-gray-700 mt-1">全枠空き</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
