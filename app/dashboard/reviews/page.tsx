"use client";
import { useState, useEffect } from "react";
import { Star, QrCode, MessageSquare, Loader2, Copy, CheckCircle2 } from "lucide-react";

type QrSet = { review: string; line: string; booking: string };
type Review = { id: string; author: string; rating: number; text: string; replied: boolean; date: string };

export default function ReviewsPage() {
  const [qrSet, setQrSet] = useState<QrSet | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeQr, setActiveQr] = useState<"review" | "line" | "booking">("review");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((d) => { setQrSet(d.qrSet); setReviews(d.recentReviews); setStats(d.stats); })
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateReply = async (r: Review) => {
    setGeneratingId(r.id);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate-reply", reviewId: r.id, reviewText: r.text, rating: r.rating, authorName: r.author }),
    });
    if (res.ok) { const d = await res.json(); setReplies((p) => ({ ...p, [r.id]: d.reply })); }
    setGeneratingId(null);
  };

  const copy = (text: string, key: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };

  if (loading) return <div className="p-8 flex items-center gap-2 text-gray-500"><Loader2 size={16} className="animate-spin" />読み込み中...</div>;

  const QR_LABELS = { review: "Googleレビュー", line: "LINE登録", booking: "予約ページ" };
  const QR_ICONS = { review: "⭐", line: "💬", booking: "📅" };

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Star size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">Review Velocity</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">レビュー速度加速</h1>
        <p className="text-sm text-gray-500 mt-1">QRコード自動生成 × AI返信で口コミを加速させる</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "平均評価", value: stats.averageRating?.toFixed(1) + "⭐", color: "text-gold" },
          { label: "総レビュー数", value: stats.totalReviews, color: "text-white" },
          { label: "返信率", value: `${stats.responseRate}%`, color: "text-emerald-400" },
          { label: "5つ星率", value: `${stats.fiveStarRate}%`, color: "text-yellow-400" },
        ].map((m) => (
          <div key={m.label} className="dashboard-card">
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-gray-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="dashboard-card">
          <p className="text-sm font-medium text-white mb-4 flex items-center gap-2"><QrCode size={14} className="text-gold" />QRコードセット</p>
          <div className="flex gap-2 mb-4">
            {(Object.keys(QR_LABELS) as (keyof typeof QR_LABELS)[]).map((k) => (
              <button key={k} onClick={() => setActiveQr(k)}
                className={`flex-1 py-2 text-xs rounded-lg border transition-all ${activeQr === k ? "bg-gold/20 border-gold/30 text-gold" : "bg-[#12121A] border-[#2A2A3E] text-gray-400"}`}>
                {QR_ICONS[k]} {QR_LABELS[k]}
              </button>
            ))}
          </div>
          {qrSet && (
            <div className="flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSet[activeQr]} alt={QR_LABELS[activeQr]} className="w-48 h-48 rounded-lg" />
              <p className="text-xs text-gray-500 mt-2">{QR_LABELS[activeQr]} QRコード</p>
              <a href={qrSet[activeQr]} download target="_blank" rel="noopener noreferrer"
                className="mt-2 px-4 py-1.5 bg-gold/10 border border-gold/30 text-gold text-xs rounded-lg hover:bg-gold/20">
                ダウンロード
              </a>
            </div>
          )}
        </div>

        <div className="dashboard-card">
          <p className="text-sm font-medium text-white mb-4 flex items-center gap-2"><MessageSquare size={14} className="text-gold" />最近の口コミ</p>
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="p-3 bg-[#12121A] rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-gray-300">{r.author}</p>
                    <span className="text-xs text-yellow-400">{"⭐".repeat(r.rating)}</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${r.replied ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                    {r.replied ? "返信済" : "未返信"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-2">{r.text}</p>
                {!r.replied && (
                  replies[r.id] ? (
                    <div className="border-l-2 border-gold pl-2">
                      <p className="text-[10px] text-gold mb-1">AI返信案</p>
                      <p className="text-xs text-gray-300 mb-1">{replies[r.id]}</p>
                      <button onClick={() => copy(replies[r.id], r.id)} className="text-[10px] text-gray-500 hover:text-gold flex items-center gap-1">
                        {copied === r.id ? <CheckCircle2 size={9} className="text-emerald-400" /> : <Copy size={9} />}コピー
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => handleGenerateReply(r)} disabled={generatingId === r.id}
                      className="text-[10px] text-gold hover:text-gold-light flex items-center gap-1 disabled:opacity-50">
                      {generatingId === r.id ? <Loader2 size={9} className="animate-spin" /> : null}AI返信を生成
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
