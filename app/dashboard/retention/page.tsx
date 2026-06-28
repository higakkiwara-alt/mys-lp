"use client";
import { useState, useEffect } from "react";
import { Users, AlertTriangle, Send, Loader2, Heart, TrendingDown } from "lucide-react";

type Customer = {
  id: string;
  name: string;
  lastVisit: string;
  daysSince: number;
  visitCount: number;
  churnRisk: number;
  segment: string;
};

export default function RetentionPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [bulkRunning, setBulkRunning] = useState(false);
  const [filter, setFilter] = useState<"all" | "high-risk" | "medium-risk">("all");

  useEffect(() => {
    fetch("/api/retention")
      .then((r) => r.json())
      .then((d) => { setCustomers(d.customers); setStats(d.stats); })
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async (c: Customer) => {
    setGeneratingId(c.id);
    const res = await fetch("/api/retention", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate-message", customerId: c.id, customerName: c.name, daysSince: c.daysSince, visitCount: c.visitCount }),
    });
    if (res.ok) { const d = await res.json(); setMessages((p) => ({ ...p, [c.id]: d.message })); }
    setGeneratingId(null);
  };

  const handleBulk = async () => {
    setBulkRunning(true);
    const res = await fetch("/api/retention", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bulk-campaign" }),
    });
    if (res.ok) {
      const d = await res.json();
      const map: Record<string, string> = {};
      d.messages.forEach((m: { customerId: string; message: string }) => { map[m.customerId] = m.message; });
      setMessages((p) => ({ ...p, ...map }));
    }
    setBulkRunning(false);
  };

  const filtered = filter === "all" ? customers : customers.filter((c) => c.segment === filter);

  const riskColor = (risk: number) => risk >= 0.7 ? "text-red-400 bg-red-500/10" : risk >= 0.4 ? "text-yellow-400 bg-yellow-500/10" : "text-emerald-400 bg-emerald-500/10";

  if (loading) return <div className="p-8 flex items-center gap-2 text-gray-500"><Loader2 size={16} className="animate-spin" />読み込み中...</div>;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Heart size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">Retention Guardian</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">リテンション AI</h1>
        <p className="text-sm text-gray-500 mt-1">離脱予測 × パーソナライズ再来店メッセージで顧客を守る</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "総顧客数", value: stats.totalCustomers, icon: Users, color: "text-white" },
          { label: "高リスク", value: stats.highRisk, icon: AlertTriangle, color: "text-red-400" },
          { label: "中リスク", value: stats.mediumRisk, icon: TrendingDown, color: "text-yellow-400" },
          { label: "維持率", value: `${stats.retentionRate}%`, icon: Heart, color: "text-emerald-400" },
        ].map((m) => (
          <div key={m.label} className="dashboard-card">
            <m.icon size={14} className={`${m.color} mb-2`} />
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-gray-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(["all", "high-risk", "medium-risk"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${filter === f ? "bg-gold/20 border-gold/30 text-gold" : "bg-[#1E1E2E] border-[#2A2A3E] text-gray-400"}`}>
              {f === "all" ? "全員" : f === "high-risk" ? "🔴 高リスク" : "🟡 中リスク"}
            </button>
          ))}
        </div>
        <button onClick={handleBulk} disabled={bulkRunning}
          className="flex items-center gap-1.5 px-4 py-2 bg-gold rounded-lg text-white text-xs font-medium hover:bg-gold-dark disabled:opacity-50">
          {bulkRunning ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          一括メッセージ生成
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map((c) => (
          <div key={c.id} className="dashboard-card">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-sm font-medium text-white">{c.name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${riskColor(c.churnRisk)}`}>
                    離脱リスク {Math.round(c.churnRisk * 100)}%
                  </span>
                </div>
                <p className="text-xs text-gray-500">最終来店: {c.daysSince}日前 · {c.visitCount}回来店</p>
                {messages[c.id] && (
                  <div className="mt-2 p-2 bg-[#12121A] rounded-lg border-l-2 border-gold">
                    <p className="text-xs text-gold mb-1">LINE メッセージ案</p>
                    <p className="text-xs text-gray-300">{messages[c.id]}</p>
                  </div>
                )}
              </div>
              <button onClick={() => handleGenerate(c)} disabled={generatingId === c.id}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-[#12121A] border border-[#2A2A3E] text-gray-400 rounded-lg text-xs hover:border-gold/30 hover:text-gold disabled:opacity-50">
                {generatingId === c.id ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                生成
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
