"use client";
import { useState, useEffect } from "react";
import { Target, AlertCircle, Loader2, Sparkles, Copy, CheckCircle2 } from "lucide-react";

type PainPoint = { pain: string; count: number; competitors: string[] };
type Ad = { id: string; targetPain: string; headline: string; body: string; platform: string; status: string };
type NegativeReview = { competitor: string; rating: number; text: string; date: string };

export default function CompetitorStealPage() {
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [negativeReviews, setNegativeReviews] = useState<NegativeReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPain, setSelectedPain] = useState<string | null>(null);
  const [generatingAd, setGeneratingAd] = useState(false);
  const [newAd, setNewAd] = useState<Partial<Ad> | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/competitor/steal")
      .then((r) => r.json())
      .then((d) => { setPainPoints(d.painPoints); setAds(d.ads); setNegativeReviews(d.negativeReviews); })
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateAd = async () => {
    if (!selectedPain) return;
    setGeneratingAd(true);
    setNewAd(null);
    const res = await fetch("/api/competitor/steal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate-ad", painPoint: selectedPain }),
    });
    if (res.ok) { const d = await res.json(); setNewAd(d.ad); }
    setGeneratingAd(false);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const res = await fetch("/api/competitor/steal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "analyze-competitors" }),
    });
    if (res.ok) { const d = await res.json(); setSummary(d.summary); }
    setAnalyzing(false);
  };

  const copy = (text: string, key: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };

  if (loading) return <div className="p-8 flex items-center gap-2 text-gray-500"><Loader2 size={16} className="animate-spin" />読み込み中...</div>;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Target size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">Competitor Steal Machine</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">競合顧客強奪マシン</h1>
        <p className="text-sm text-gray-500 mt-1">競合の低評価口コミを分析して差別化広告を自動生成</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-white flex items-center gap-2"><AlertCircle size={14} className="text-red-400" />競合の不満ポイント</p>
              <button onClick={handleAnalyze} disabled={analyzing}
                className="text-xs px-3 py-1.5 bg-gold/10 border border-gold/30 text-gold rounded-lg hover:bg-gold/20 disabled:opacity-50 flex items-center gap-1">
                {analyzing ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}AI分析
              </button>
            </div>
            <div className="space-y-2">
              {painPoints.map((p) => (
                <button key={p.pain} onClick={() => setSelectedPain(p.pain)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${selectedPain === p.pain ? "bg-gold/10 border-gold/30" : "bg-[#12121A] border-[#2A2A3E] hover:border-gold/20"}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-300">{p.pain}</p>
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">{p.count}件</span>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">{p.competitors.join("、")}</p>
                </button>
              ))}
            </div>
            <button onClick={handleGenerateAd} disabled={!selectedPain || generatingAd}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-gold rounded-lg text-white text-sm font-medium hover:bg-gold-dark disabled:opacity-50">
              {generatingAd ? <><Loader2 size={14} className="animate-spin" />生成中...</> : <><Sparkles size={14} />広告コピーを生成</>}
            </button>
          </div>

          {summary && (
            <div className="dashboard-card border-l-2 border-gold">
              <p className="text-xs text-gold mb-2">AI競合分析サマリー</p>
              <p className="text-xs text-gray-300 whitespace-pre-wrap">{summary}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {newAd && (
            <div className="dashboard-card border border-gold/30">
              <p className="text-xs text-gold mb-3 flex items-center gap-1"><Sparkles size={10} />新規生成広告</p>
              <p className="text-sm font-bold text-white mb-2">{newAd.headline}</p>
              <p className="text-xs text-gray-300 mb-3">{newAd.body}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">{newAd.platform}</span>
                <button onClick={() => copy(`${newAd.headline}\n\n${newAd.body}`, "new-ad")}
                  className="text-[10px] text-gray-500 hover:text-gold flex items-center gap-1">
                  {copied === "new-ad" ? <CheckCircle2 size={9} className="text-emerald-400" /> : <Copy size={9} />}コピー
                </button>
              </div>
            </div>
          )}

          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-3">既存広告ライブラリ</p>
            <div className="space-y-3">
              {ads.map((ad) => (
                <div key={ad.id} className="p-3 bg-[#12121A] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-gray-500">{ad.targetPain}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${ad.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-400"}`}>
                        {ad.status === "active" ? "配信中" : "下書き"}
                      </span>
                      <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">{ad.platform}</span>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-white mb-1">{ad.headline}</p>
                  <p className="text-[10px] text-gray-400">{ad.body}</p>
                  <button onClick={() => copy(`${ad.headline}\n\n${ad.body}`, ad.id)}
                    className="mt-1 text-[10px] text-gray-600 hover:text-gold flex items-center gap-0.5">
                    {copied === ad.id ? <CheckCircle2 size={8} className="text-emerald-400" /> : <Copy size={8} />}コピー
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-3">競合低評価口コミ</p>
            <div className="space-y-2 max-h-48 overflow-y-auto dashboard-scroll">
              {negativeReviews.map((r, i) => (
                <div key={i} className="p-2 bg-[#12121A] rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-medium text-red-400">{"⭐".repeat(r.rating)}</span>
                    <span className="text-[10px] text-gray-500">{r.competitor}</span>
                    <span className="text-[9px] text-gray-600 ml-auto">{r.date}</span>
                  </div>
                  <p className="text-[10px] text-gray-400">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
