"use client";
import { useState } from "react";
import {
  Share2, Instagram, Globe, MessageSquare, FileText,
  Video, ChevronRight, CheckCircle2, Loader2, Sparkles
} from "lucide-react";

const PLATFORMS = [
  { id: "google", label: "Google Business", icon: "G", color: "#4285F4" },
  { id: "line", label: "LINE 公式", icon: "L", color: "#06C755" },
  { id: "wordpress", label: "WordPress ブログ", icon: "W", color: "#21759B" },
  { id: "tiktok", label: "TikTok 台本", icon: "T", color: "#000000" },
  { id: "youtube", label: "YouTube Shorts", icon: "Y", color: "#FF0000" },
  { id: "x", label: "X (Twitter)", icon: "𝕏", color: "#000000" },
  { id: "note", label: "note 記事", icon: "N", color: "#41C9B4" },
];

type PlatformContent = {
  platform: string;
  content: string;
  title?: string;
  hashtags?: string[];
};

export default function ContentHubPage() {
  const [instagramPost, setInstagramPost] = useState("");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<PlatformContent[]>([]);
  const [selected, setSelected] = useState<string[]>(PLATFORMS.map((p) => p.id));
  const [activeResult, setActiveResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!instagramPost.trim()) return;
    setGenerating(true);
    setResults([]);

    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: instagramPost, platforms: selected }),
      });
      const data = await res.json();
      setResults(data.expansions ?? []);
      setActiveResult(data.expansions?.[0]?.platform ?? null);
    } catch {
      setResults(
        selected.map((platform) => ({
          platform,
          content: `【API接続後に自動生成】\n\n元の投稿内容をAIが${platform}向けに最適化します。\nAPIキーを.env.localに設定してください。`,
          hashtags: ["#立川美容室", "#髪質改善", "#縮毛矯正"],
        }))
      );
      setActiveResult(selected[0]);
    } finally {
      setGenerating(false);
    }
  };

  const activeContent = results.find((r) => r.platform === activeResult);

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Share2 size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">Content Hub</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">投稿 → 全媒体へ自動展開</h1>
        <p className="text-sm text-gray-500 mt-1">Instagramの投稿を起点に、AIが全プラットフォーム用コンテンツを生成します</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input */}
        <div className="lg:col-span-2 space-y-4">
          <div className="dashboard-card">
            <div className="flex items-center gap-2 mb-3">
              <Instagram size={16} className="text-pink-400" />
              <p className="text-sm font-medium text-white">Instagram 投稿（元ネタ）</p>
            </div>
            <textarea
              value={instagramPost}
              onChange={(e) => setInstagramPost(e.target.value)}
              placeholder="例：縮毛矯正のお客様✨ボブスタイルで毎朝のスタイリングが楽になりました！ダメージレスな独自処方で、サラサラな仕上がりが続きます。#縮毛矯正 #立川美容室"
              rows={8}
              className="w-full bg-[#12121A] border border-[#2A2A3E] rounded-lg p-3 text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-gold/50"
            />
            <p className="text-xs text-gray-600 mt-1">{instagramPost.length} 文字</p>
          </div>

          {/* Platform selection */}
          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-3">展開先を選択</p>
            <div className="space-y-2">
              {PLATFORMS.map((p) => (
                <label key={p.id} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={(e) => {
                      setSelected(e.target.checked
                        ? [...selected, p.id]
                        : selected.filter((s) => s !== p.id));
                    }}
                    className="accent-gold"
                  />
                  <span className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center shrink-0"
                    style={{ background: p.color + "33", color: p.color }}>
                    {p.icon}
                  </span>
                  <span className="text-sm text-gray-400 group-hover:text-white transition-colors">{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !instagramPost.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gold rounded-lg text-white font-medium hover:bg-gold-dark transition-colors disabled:opacity-50"
          >
            {generating ? (
              <><Loader2 size={16} className="animate-spin" />生成中...</>
            ) : (
              <><Sparkles size={16} />AI で全媒体コンテンツ生成</>
            )}
          </button>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {results.length > 0 ? (
            <div className="dashboard-card h-full flex flex-col">
              <p className="text-sm font-medium text-white mb-3">生成結果（{results.length}媒体）</p>
              {/* Tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {results.map((r) => {
                  const p = PLATFORMS.find((pl) => pl.id === r.platform);
                  return (
                    <button
                      key={r.platform}
                      onClick={() => setActiveResult(r.platform)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all ${
                        activeResult === r.platform
                          ? "bg-gold/20 text-gold border border-gold/40"
                          : "bg-[#12121A] text-gray-400 border border-[#2A2A3E] hover:border-gray-500"
                      }`}
                    >
                      <CheckCircle2 size={10} className="text-emerald-400" />
                      {p?.label ?? r.platform}
                    </button>
                  );
                })}
              </div>
              {/* Content */}
              {activeContent && (
                <div className="flex-1 flex flex-col gap-3">
                  {activeContent.title && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">タイトル</p>
                      <p className="text-sm text-white font-medium">{activeContent.title}</p>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">本文</p>
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap bg-[#12121A] p-3 rounded-lg flex-1 leading-relaxed">
                      {activeContent.content}
                    </pre>
                  </div>
                  {activeContent.hashtags && activeContent.hashtags.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">ハッシュタグ</p>
                      <div className="flex flex-wrap gap-1">
                        {activeContent.hashtags.map((tag) => (
                          <span key={tag} className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <button className="w-full py-2 bg-[#12121A] border border-[#2A2A3E] hover:border-gold/40 rounded-lg text-sm text-gray-400 hover:text-white transition-all">
                    このプラットフォームに投稿する
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="dashboard-card h-full flex flex-col items-center justify-center text-center py-16">
              <Share2 size={48} className="text-gray-700 mb-4" />
              <p className="text-gray-500 text-sm">Instagram の投稿を入力して<br />「AI で全媒体コンテンツ生成」を押してください</p>
              <p className="text-gray-700 text-xs mt-3">最大{PLATFORMS.length}媒体のコンテンツを数秒で生成します</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
