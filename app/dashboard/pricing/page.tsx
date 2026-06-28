"use client";
import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Loader2, Zap, BarChart2 } from "lucide-react";

type Slot = {
  menu: string;
  dayLabel: string;
  hour: number;
  fillRate: number;
  basePrice: number;
  suggestPrice: number;
};

export default function PricingPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [monthlyStats, setMonthlyStats] = useState<{ month: string; revenue: number; bookings: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [view, setView] = useState<"slots" | "chart">("slots");

  useEffect(() => {
    fetch("/api/pricing")
      .then((r) => r.json())
      .then((d) => { setSlots(d.slots); setSummary(d.summary); setMonthlyStats(d.monthlyStats); })
      .finally(() => setLoading(false));
  }, []);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const res = await fetch("/api/pricing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "analyze" }) });
    if (res.ok) { const d = await res.json(); setAnalysis(d.analysis); }
    setAnalyzing(false);
  };

  const fillColor = (rate: number) =>
    rate >= 0.9 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
    rate >= 0.6 ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
    rate >= 0.4 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
    "bg-red-500/20 text-red-400 border-red-500/30";

  if (loading) return <div className="p-8 flex items-center gap-2 text-gray-500"><Loader2 size={16} className="animate-spin" />読み込み中...</div>;

  const maxRevenue = Math.max(...monthlyStats.map((m) => m.revenue));

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">Price Optimizer</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">価格最適化エンジン</h1>
        <p className="text-sm text-gray-500 mt-1">予約充填率分析 × AI価格提案で売上を最大化</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "平均充填率", value: `${Math.round((summary.avgFillRate ?? 0) * 100)}%`, color: "text-blue-400" },
          { label: "低稼働スロット", value: `${summary.lowFillSlots}枠`, color: "text-red-400" },
          { label: "高需要スロット", value: `${summary.highDemandSlots}枠`, color: "text-emerald-400" },
          { label: "売上ポテンシャル", value: `¥${(summary.potentialRevenue ?? 0).toLocaleString()}`, color: "text-gold" },
        ].map((m) => (
          <div key={m.label} className="dashboard-card">
            <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-gray-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(["slots", "chart"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${view === v ? "bg-gold/20 border-gold/30 text-gold" : "bg-[#1E1E2E] border-[#2A2A3E] text-gray-400"}`}>
              {v === "slots" ? <><BarChart2 size={10} className="inline mr-1" />スロット分析</> : <><TrendingUp size={10} className="inline mr-1" />月次推移</>}
            </button>
          ))}
        </div>
        <button onClick={handleAnalyze} disabled={analyzing}
          className="flex items-center gap-1.5 px-4 py-2 bg-gold rounded-lg text-white text-xs font-medium hover:bg-gold-dark disabled:opacity-50">
          {analyzing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
          AI価格戦略を生成
        </button>
      </div>

      {view === "slots" ? (
        <div className="space-y-3">
          {slots.map((s, i) => (
            <div key={i} className="dashboard-card">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-white">{s.menu}</p>
                    <span className="text-xs text-gray-500">{s.dayLabel} {s.hour}時台</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${fillColor(s.fillRate)}`}>
                      充填率 {Math.round(s.fillRate * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#12121A] rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-gradient-to-r from-gold to-gold-light transition-all" style={{ width: `${s.fillRate * 100}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500 line-through">¥{s.basePrice.toLocaleString()}</p>
                  <p className={`text-sm font-bold ${s.suggestPrice < s.basePrice ? "text-red-400" : "text-emerald-400"}`}>
                    ¥{s.suggestPrice.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-600">AI推奨価格</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dashboard-card">
          <p className="text-sm font-medium text-white mb-4">月次売上推移</p>
          <div className="flex items-end gap-2 h-40">
            {monthlyStats.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <p className="text-[10px] text-gray-500">¥{Math.round(m.revenue / 10000)}万</p>
                <div className="w-full bg-gold/30 rounded-t transition-all hover:bg-gold"
                  style={{ height: `${(m.revenue / maxRevenue) * 120}px` }} />
                <p className="text-[9px] text-gray-600">{m.month}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis && (
        <div className="mt-4 dashboard-card border-l-2 border-gold">
          <p className="text-xs text-gold mb-2 flex items-center gap-1"><Zap size={10} />AI価格戦略提案</p>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{analysis}</p>
        </div>
      )}
    </div>
  );
}
