"use client";
import { useState, useEffect, useRef } from "react";
import { Mic, Brain, Sparkles, Loader2, Copy, CheckCircle2, MicOff } from "lucide-react";

type Memo = {
  id: string;
  stylist: string;
  date: string;
  transcript: string;
  insights: {
    techniques: string[];
    customerNeeds: string[];
    products: string[];
    followUpActions: string[];
    summary: string;
  };
  contentGenerated: boolean;
};

export default function StylistBrainPage() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState<Memo["insights"] | null>(null);
  const [content, setContent] = useState<{ instagram: string; tiktok: string; blog: string; hashtags: string[] } | null>(null);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/stylist")
      .then((r) => r.json())
      .then((d) => setMemos(d.memos))
      .finally(() => setLoading(false));
  }, []);

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;
    setAnalyzing(true);
    setInsights(null);
    setContent(null);
    const res = await fetch("/api/stylist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "analyze", transcript }),
    });
    if (res.ok) { const d = await res.json(); setInsights(d.insights); }
    setAnalyzing(false);
  };

  const handleGenerateContent = async () => {
    if (!insights) return;
    setGeneratingContent(true);
    const res = await fetch("/api/stylist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate-content", insights }),
    });
    if (res.ok) { const d = await res.json(); setContent(d.content); }
    setGeneratingContent(false);
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Brain size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">Stylist Brain</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">スタイリストコンテンツ脳</h1>
        <p className="text-sm text-gray-500 mt-1">音声メモ → 自動文字起こし → SNSコンテンツ生成</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-3">施術メモを入力</p>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setRecording(!recording)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-all ${recording ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse" : "bg-[#12121A] border-[#2A2A3E] text-gray-400 hover:border-gold/30"}`}>
                {recording ? <><MicOff size={12} />録音停止</> : <><Mic size={12} />音声メモ</>}
              </button>
              <span className="text-xs text-gray-600 flex items-center">※ 音声入力はマイク許可が必要</span>
            </div>
            <textarea
              ref={textareaRef}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="例: 本日のお客様は30代女性。縮毛矯正希望。Aujuaを使用してダメージケアしながら施術。仕上がりに大変満足。"
              rows={6}
              className="w-full bg-[#12121A] border border-[#2A2A3E] rounded-lg p-3 text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-gold/50 mb-3"
            />
            <button onClick={handleAnalyze} disabled={analyzing || !transcript.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gold rounded-lg text-white text-sm font-medium hover:bg-gold-dark disabled:opacity-50">
              {analyzing ? <><Loader2 size={14} className="animate-spin" />分析中...</> : <><Sparkles size={14} />AIで施術を分析</>}
            </button>
          </div>

          {insights && (
            <div className="dashboard-card">
              <p className="text-sm font-medium text-white mb-3">施術インサイト</p>
              <div className="space-y-2">
                {[
                  { label: "施術技術", items: insights.techniques },
                  { label: "お客様ニーズ", items: insights.customerNeeds },
                  { label: "使用商材", items: insights.products },
                  { label: "フォローアップ", items: insights.followUpActions },
                ].map((section) => section.items.length > 0 && (
                  <div key={section.label}>
                    <p className="text-[10px] text-gray-500 mb-1">{section.label}</p>
                    <div className="flex flex-wrap gap-1">
                      {section.items.map((item) => (
                        <span key={item} className="text-xs bg-gold/10 text-gold border border-gold/20 px-2 py-0.5 rounded">{item}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3 p-2 bg-[#12121A] rounded">{insights.summary}</p>
              <button onClick={handleGenerateContent} disabled={generatingContent}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-[#12121A] border border-gold/30 text-gold rounded-lg text-sm hover:bg-gold/10 disabled:opacity-50">
                {generatingContent ? <><Loader2 size={12} className="animate-spin" />生成中...</> : <><Sparkles size={12} />SNSコンテンツを生成</>}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {content ? (
            <>
              {[
                { key: "instagram", label: "Instagram", icon: "📸", text: content.instagram },
                { key: "tiktok", label: "TikTok", icon: "📱", text: content.tiktok },
                { key: "blog", label: "ブログ記事", icon: "📝", text: content.blog },
              ].map((item) => (
                <div key={item.key} className="dashboard-card">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-white">{item.icon} {item.label}</p>
                    <button onClick={() => copyText(item.text, item.key)}
                      className="text-[10px] text-gray-500 hover:text-gold flex items-center gap-1">
                      {copied === item.key ? <CheckCircle2 size={10} className="text-emerald-400" /> : <Copy size={10} />}
                      {copied === item.key ? "コピー済" : "コピー"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{item.text}</p>
                  {item.key === "instagram" && content.hashtags && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {content.hashtags.map((tag) => (
                        <span key={tag} className="text-[10px] text-blue-400">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="dashboard-card">
              <p className="text-sm font-medium text-white mb-4">過去の施術メモ</p>
              {loading ? (
                <div className="flex items-center gap-2 text-gray-500"><Loader2 size={12} className="animate-spin" />読み込み中...</div>
              ) : (
                <div className="space-y-3">
                  {memos.map((m) => (
                    <div key={m.id} className="p-3 bg-[#12121A] rounded-lg cursor-pointer hover:border-gold/20 border border-transparent transition-all"
                      onClick={() => setTranscript(m.transcript)}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-gray-300">{m.stylist}</p>
                        <div className="flex items-center gap-2">
                          {m.contentGenerated && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">生成済</span>}
                          <span className="text-[10px] text-gray-600">{m.date}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{m.transcript}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
