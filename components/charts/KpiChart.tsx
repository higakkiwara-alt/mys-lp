"use client";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, Radar
} from "recharts";

const MONTHLY_DATA = [
  { month: "1月", new: 18, repeat: 42, revenue: 680000 },
  { month: "2月", new: 21, repeat: 45, revenue: 720000 },
  { month: "3月", new: 25, repeat: 48, revenue: 810000 },
  { month: "4月", new: 22, repeat: 51, revenue: 790000 },
  { month: "5月", new: 27, repeat: 53, revenue: 870000 },
  { month: "6月", new: 28, repeat: 56, revenue: 920000 },
];

const RANK_DATA = [
  { date: "6/1", 縮毛矯正立川: 5, 髪質改善立川: 9 },
  { date: "6/7", 縮毛矯正立川: 4, 髪質改善立川: 8 },
  { date: "6/14", 縮毛矯正立川: 4, 髪質改善立川: 7 },
  { date: "6/21", 縮毛矯正立川: 3, 髪質改善立川: 7 },
  { date: "6/28", 縮毛矯正立川: 3, 髪質改善立川: 7 },
];

const SNS_DATA = [
  { platform: "Instagram", フォロワー: 1247, エンゲージメント: 4.2 },
  { platform: "LINE", フォロワー: 342, エンゲージメント: 28.5 },
  { platform: "Google", フォロワー: 117, エンゲージメント: 4.71 },
];

const customTooltipStyle = {
  backgroundColor: "#1E1E2E",
  border: "1px solid #2A2A3E",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "12px",
};

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={MONTHLY_DATA}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#B8975A" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#B8975A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3E" />
        <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`} />
        <Tooltip contentStyle={customTooltipStyle}
          formatter={(v: number) => [`¥${v.toLocaleString()}`, "売上"]} />
        <Area type="monotone" dataKey="revenue" stroke="#B8975A" strokeWidth={2}
          fill="url(#revenueGrad)" dot={{ fill: "#B8975A", r: 3 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CustomerChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={MONTHLY_DATA} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3E" />
        <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={customTooltipStyle} />
        <Legend wrapperStyle={{ fontSize: "11px", color: "#888" }} />
        <Bar dataKey="new" name="新規" fill="#B8975A" radius={[2, 2, 0, 0]} />
        <Bar dataKey="repeat" name="リピート" fill="#2A3A2E" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RankChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={RANK_DATA}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3E" />
        <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis reversed tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={(v) => `${v}位`} domain={[1, 15]} />
        <Tooltip contentStyle={customTooltipStyle}
          formatter={(v: number) => [`${v}位`]} />
        <Legend wrapperStyle={{ fontSize: "11px", color: "#888" }} />
        <Line type="monotone" dataKey="縮毛矯正立川" stroke="#B8975A" strokeWidth={2}
          dot={{ fill: "#B8975A", r: 3 }} />
        <Line type="monotone" dataKey="髪質改善立川" stroke="#4A90D9" strokeWidth={2}
          dot={{ fill: "#4A90D9", r: 3 }} strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  );
}

const RADAR_DATA = [
  { metric: "口コミ数", Mys: 87, OCEAN: 142, FORTE: 64 },
  { metric: "評価点", Mys: 94, OCEAN: 78, FORTE: 82 },
  { metric: "MEO順位", Mys: 80, OCEAN: 90, FORTE: 60 },
  { metric: "SNS投稿", Mys: 72, OCEAN: 88, FORTE: 55 },
  { metric: "メニュー数", Mys: 70, OCEAN: 85, FORTE: 75 },
  { metric: "写真枚数", Mys: 65, OCEAN: 95, FORTE: 70 },
];

export function CompetitorRadar() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={RADAR_DATA} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#2A2A3E" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: "#888", fontSize: 11 }} />
        <Radar name="Mys" dataKey="Mys" stroke="#B8975A" fill="#B8975A" fillOpacity={0.25} strokeWidth={2} />
        <Radar name="OCEAN TOKYO" dataKey="OCEAN" stroke="#4A90D9" fill="#4A90D9" fillOpacity={0.15} strokeWidth={1.5} strokeDasharray="4 2" />
        <Radar name="FORTE" dataKey="FORTE" stroke="#E879A0" fill="#E879A0" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 2" />
        <Legend wrapperStyle={{ fontSize: "11px", color: "#888" }} />
        <Tooltip contentStyle={{ background: "#1E1E2E", border: "1px solid #2A2A3E", borderRadius: "8px", fontSize: "12px" }}
          formatter={(v: number) => [`${v}点`]} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
