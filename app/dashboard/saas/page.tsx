"use client";
import { useState, useEffect } from "react";
import { Building2, TrendingUp, Users, DollarSign, Loader2, Sparkles } from "lucide-react";

type Client = {
  id: string;
  salonName: string;
  ownerName: string;
  plan: string;
  mrr: number;
  status: string;
  startDate: string;
  features: string[];
};

type Plan = { id: string; name: string; price: number; features: string[] };

export default function SaasPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<Record<string, number | string>>({});
  const [plans, setPlans] = useState<Plan[]>([]);
  const [mrrHistory, setMrrHistory] = useState<{ month: string; mrr: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [generating, setGenerating] = useState(false);
  const [proposal, setProposal] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/saas")
      .then((r) => r.json())
      .then((d) => { setClients(d.clients); setStats(d.stats); setPlans(d.plans); setMrrHistory(d.mrrHistory); })
      .finally(() => setLoading(false));
  }, []);

  const handleProposal = async (client: Client) => {
    setSelectedClient(client);
    setGenerating(true);
    setProposal(null);
    const res = await fetch("/api/saas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "proposal", client }),
    });
    if (res.ok) { const d = await res.json(); setProposal(d.proposal); }
    setGenerating(false);
  };

  const planColor: Record<string, string> = { starter: "text-gray-400", standard: "text-blue-400", pro: "text-gold" };
  const statusColor: Record<string, string> = { active: "text-emerald-400 bg-emerald-500/10", trial: "text-yellow-400 bg-yellow-500/10", churned: "text-red-400 bg-red-500/10" };

  if (loading) return <div className="p-8 flex items-center gap-2 text-gray-500"><Loader2 size={16} className="animate-spin" />読み込み中...</div>;

  const maxMrr = Math.max(...mrrHistory.map((m) => m.mrr));

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">SaaS Console</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">SaaSコンソール</h1>
        <p className="text-sm text-gray-500 mt-1">美容室AI OS のクライアント管理・MRR追跡</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "MRR", value: `¥${(stats.mrr as number ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-gold" },
          { label: "ARR", value: `¥${Math.round((stats.arr as number ?? 0) / 10000)}万`, icon: TrendingUp, color: "text-emerald-400" },
          { label: "契約サロン", value: `${stats.activeClients}件`, icon: Building2, color: "text-blue-400" },
          { label: "NPS", value: `${stats.nps}`, icon: Users, color: "text-purple-400" },
        ].map((m) => (
          <div key={m.label} className="dashboard-card">
            <m.icon size={14} className={`${m.color} mb-2`} />
            <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-gray-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 dashboard-card">
          <p className="text-sm font-medium text-white mb-4">MRR推移</p>
          <div className="flex items-end gap-2 h-32">
            {mrrHistory.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <p className="text-[9px] text-gray-600">¥{Math.round(m.mrr / 10000)}万</p>
                <div className="w-full bg-gold/30 rounded-t hover:bg-gold transition-colors"
                  style={{ height: `${(m.mrr / maxMrr) * 100}px` }} />
                <p className="text-[9px] text-gray-600">{m.month}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <p className="text-sm font-medium text-white mb-4">プラン構成</p>
          <div className="space-y-3">
            {plans.map((p) => {
              const count = clients.filter((c) => c.plan === p.id).length;
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${planColor[p.id]}`}>{p.name}</span>
                    <span className="text-xs text-gray-500">{count}件 · ¥{p.price.toLocaleString()}/月</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#12121A] rounded-full">
                    <div className="h-1.5 rounded-full bg-gold" style={{ width: `${(count / clients.length) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <p className="text-sm font-medium text-white mb-4">クライアント一覧</p>
        <div className="space-y-3">
          {clients.map((c) => (
            <div key={c.id} className="flex items-center gap-4 p-3 bg-[#12121A] rounded-lg hover:bg-[#1A1A2A] transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-white">{c.salonName}</p>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full ${statusColor[c.status]}`}>
                    {c.status === "active" ? "契約中" : c.status === "trial" ? "トライアル" : "解約"}
                  </span>
                  <span className={`text-xs font-medium ${planColor[c.plan]}`}>{c.plan}</span>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-gray-500">{c.ownerName}</p>
                  <p className="text-xs text-gray-600">開始: {c.startDate}</p>
                  <div className="flex gap-1">
                    {c.features.map((f) => (
                      <span key={f} className="text-[8px] bg-[#2A2A3E] text-gray-500 px-1 py-0.5 rounded">{f}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gold">¥{c.mrr.toLocaleString()}</p>
                <p className="text-[10px] text-gray-600">MRR/月</p>
              </div>
              <button onClick={() => handleProposal(c)}
                className="shrink-0 px-3 py-1.5 bg-gold/10 border border-gold/30 text-gold rounded-lg text-xs hover:bg-gold/20 flex items-center gap-1">
                <Sparkles size={10} />提案
              </button>
            </div>
          ))}
        </div>
      </div>

      {(generating || proposal) && selectedClient && (
        <div className="mt-4 dashboard-card border-l-2 border-gold">
          <p className="text-xs text-gold mb-2 flex items-center gap-1"><Sparkles size={10} />{selectedClient.salonName} へのアップグレード提案</p>
          {generating ? (
            <div className="flex items-center gap-2 text-gray-500"><Loader2 size={12} className="animate-spin" />生成中...</div>
          ) : (
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{proposal}</p>
          )}
        </div>
      )}
    </div>
  );
}
