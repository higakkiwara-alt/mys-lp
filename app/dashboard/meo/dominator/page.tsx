"use client";
import { useState, useEffect } from "react";
import { MapPin, TrendingUp, Target, Zap, CheckCircle2, Loader2, BarChart2 } from "lucide-react";

type Competitor = { name: string; rating: number; reviewCount: number; photoCount: number; rank: number };
type Action = { id: string; type: string; title: string; priority: string; impact: string; done: boolean };

export default function MeoDominatorPage() {
  const [data, setData] = useState<{
    competitors: Competitor[];
    myRank: number;
    targetRank: number;
    gapAnalysis: Record<string, number>;
    actions: Action[];
    weeklyProgress: { week: string; rank: number; reviews: number; photos: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [actions, setActions] = useState<Action[]>([]);

  useEffect(() => {
    fetch("/api/meo/dominator")
      .then((r) => r.json())
      .then((d) => { setData(d); setActions(d.actions); })
      .finally(() => setLoading(false));
  }, []);

  const handleAnalyze = async () => {
    setGenerating(true);
    const res = await fetch("/api/meo/dominator", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "analyze" }) });
    if (res.ok) { const d = await res.json(); setAnalysis(d.analysis); }
    setGenerating(false);
  };

  if (loading) return <div className="p-8 flex items-center gap-2 text-gray-500"><Loader2 size={16} className="animate-spin" />読み込み中...</div>;

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">MEO Dominator</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">MEO ランク征服</h1>
        <p className="text-sm text-gray-500 mt-1">Googleマップで1位を獲得・維持するための自動分析と実行計画</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "現在の順位", value: `${data?.myRank}位`, icon: Target, color: "text-gold" },
          { label: "目標順位", value: `${data?.targetRank}位`, icon: TrendingUp, color: "text-emerald-400" },
          { label: "レビューギャップ", value: `${data?.gapAnalysis.reviewGap}件`, icon: BarChart2, color: "text-blue-400" },
          { label: "写真ギャップ", value: `${Math.abs(data?.gapAnalysis.photoGap ?? 0)}枚`, icon: Zap, color: "text-purple-400" },
        ].map((m) => (
          <div key={m.label} className="dashboard-card">
            <m.icon size={14} className={`${m.color} mb-2`} />
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-gray-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="dashboard-card">
          <p className="text-sm font-medium text-white mb-4">競合ランキング比較</p>
          <div className="space-y-3">
            {data?.competitors.map((c) => (
              <div key={c.name} className={`flex items-center gap-3 p-2 rounded-lg ${c.name === "Mys（ミース）" ? "bg-gold/10 border border-gold/20" : "bg-[#12121A]"}`}>
                <span className={`text-lg font-bold w-6 text-center ${c.rank === 1 ? "text-gold" : "text-gray-500"}`}>{c.rank}</span>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${c.name === "Mys（ミース）" ? "text-gold" : "text-gray-300"}`}>{c.name}</p>
                  <p className="text-xs text-gray-600">⭐{c.rating} · {c.reviewCount}件 · 写真{c.photoCount}枚</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-white">今週のアクション</p>
            <button onClick={handleAnalyze} disabled={generating}
              className="text-xs px-3 py-1.5 bg-gold/10 border border-gold/30 text-gold rounded-lg hover:bg-gold/20 disabled:opacity-50 flex items-center gap-1">
              {generating ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
              AI分析
            </button>
          </div>
          <div className="space-y-2">
            {actions.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-2 rounded-lg bg-[#12121A]">
                <button onClick={() => setActions((prev) => prev.map((x) => x.id === a.id ? { ...x, done: !x.done } : x))}
                  className={`mt-0.5 shrink-0 ${a.done ? "text-emerald-400" : "text-gray-600"}`}>
                  <CheckCircle2 size={14} />
                </button>
                <div className="flex-1">
                  <p className={`text-xs font-medium ${a.done ? "line-through text-gray-600" : "text-gray-300"}`}>{a.title}</p>
                  <p className="text-[10px] text-gray-600">{a.impact}</p>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${a.priority === "high" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                  {a.priority === "high" ? "重要" : "推奨"}
                </span>
              </div>
            ))}
          </div>
          {analysis && (
            <div className="mt-3 p-3 bg-[#12121A] rounded-lg border-l-2 border-gold">
              <p className="text-xs text-gold mb-1">AI分析結果</p>
              <p className="text-xs text-gray-300 whitespace-pre-wrap">{analysis}</p>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-card">
        <p className="text-sm font-medium text-white mb-4">週次進捗トレンド</p>
        <div className="grid grid-cols-4 gap-2">
          {data?.weeklyProgress.map((w) => (
            <div key={w.week} className="text-center p-3 bg-[#12121A] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">{w.week}</p>
              <p className="text-lg font-bold text-gold">{w.rank}位</p>
              <p className="text-[10px] text-gray-600">口コミ{w.reviews}件</p>
              <p className="text-[10px] text-gray-600">写真{w.photos}枚</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
