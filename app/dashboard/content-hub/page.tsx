"use client";
import { useState } from "react";
import {
  Share2, Sparkles, Loader2, CheckCircle2, Clock,
  Calendar, Send, Plus, LayoutGrid, List
} from "lucide-react";

const PLATFORMS = [
  { id: "google", label: "Google Business", color: "#4285F4", icon: "G" },
  { id: "line", label: "LINE 公式", color: "#06C755", icon: "L" },
  { id: "wordpress", label: "WordPress", color: "#21759B", icon: "W" },
  { id: "tiktok", label: "TikTok 台本", color: "#FF0050", icon: "T" },
  { id: "youtube", label: "YouTube Shorts", color: "#FF0000", icon: "Y" },
  { id: "x", label: "X (Twitter)", color: "#1DA1F2", icon: "𝕏" },
  { id: "note", label: "note", color: "#41C9B4", icon: "N" },
];

const BEST_TIMES = [
  { day: "月", hour: "8:00", score: 92 },
  { day: "水", hour: "19:00", score: 95 },
  { day: "金", hour: "18:00", score: 97 },
  { day: "土", hour: "10:00", score: 91 },
];

type ScheduledPost = { id: string; content: string; platform: string; scheduledAt: string; status: "pending" | "approved" | "rejected" | "posted" };

const INITIAL_SCHEDULED: ScheduledPost[] = [
  { id: "1", content: "縮毛矯正ビフォーアフター✨ダメージゼロでサラサラに！", platform: "google", scheduledAt: "2026-06-29 08:00", status: "pending" },
  { id: "2", content: "夏のサラサラヘアキャンペーン🌊期間限定20%OFF", platform: "line", scheduledAt: "2026-06-29 12:00", status: "approved" },
  { id: "3", content: "【ブログ更新】縮毛矯正の選び方〜失敗しないための5つのポイント〜", platform: "wordpress", scheduledAt: "2026-06-30 10:00", status: "pending" },
  { id: "4", content: "スタッフ紹介：田中スタイリストの得意スタイルとは", platform: "instagram", scheduledAt: "2026-07-01 19:00", status: "rejected" },
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
  const [activeTab, setActiveTab] = useState<"compose" | "schedule" | "analytics">("compose");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("08:00");
  const [scheduled, setScheduled] = useState<ScheduledPost[]>(INITIAL_SCHEDULED);

  const updateStatus = (id: string, status: ScheduledPost["status"]) => {
    setScheduled((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
  };

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
      const fallback = selected.map((platform) => ({
        platform,
        content: generateMockContent(platform, instagramPost),
        hashtags: ["#立川美容室", "#髪質改善", "#縮毛矯正", `#${platform}`],
      }));
      setResults(fallback);
      setActiveResult(selected[0]);
    } finally {
      setGenerating(false);
    }
  };

  const activeContent = results.find((r) => r.platform === activeResult);

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Share2 size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">Content Hub</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">投稿 → 全媒体へ自動展開</h1>
        <p className="text-sm text-gray-500 mt-1">1投稿から最大7媒体のコンテンツをAIが自動生成・スケジュール配信</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["compose", "schedule", "analytics"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              activeTab === tab ? "bg-gold/20 text-gold border border-gold/30" : "bg-[#1E1E2E] text-gray-400 border border-[#2A2A3E]"
            }`}
          >
            {tab === "compose" ? "コンテンツ作成" : tab === "schedule" ? `スケジュール (${scheduled.length})` : "分析"}
          </button>
        ))}
      </div>

      {activeTab === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Input panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="dashboard-card">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-pink-400 text-sm font-bold">📸</span>
                <p className="text-sm font-medium text-white">Instagram 投稿（元ネタ）</p>
              </div>
              <textarea
                value={instagramPost}
                onChange={(e) => setInstagramPost(e.target.value)}
                placeholder="例：縮毛矯正のお客様✨ボブスタイルで毎朝のスタイリングが楽に！ダメージレスな独自処方でサラサラな仕上がり。#縮毛矯正 #立川美容室"
                rows={7}
                className="w-full bg-[#12121A] border border-[#2A2A3E] rounded-lg p-3 text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-gold/50"
              />
              <p className="text-xs text-gray-600 mt-1">{instagramPost.length} 文字</p>
            </div>

            <div className="dashboard-card">
              <p className="text-sm font-medium text-white mb-3">展開先を選択</p>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer group p-2 rounded-lg hover:bg-[#12121A]">
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
                    <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center"
                      style={{ background: p.color + "22", color: p.color }}>
                      {p.icon}
                    </span>
                    <span className="text-xs text-gray-400 group-hover:text-white">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div className="dashboard-card">
              <p className="text-sm font-medium text-white mb-3">投稿日時（任意）</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="bg-[#12121A] border border-[#2A2A3E] rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-gold/50"
                />
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="bg-[#12121A] border border-[#2A2A3E] rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-gold/50"
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                推奨時間帯: {BEST_TIMES.map((t) => `${t.day} ${t.hour}(${t.score}点)`).join(" · ")}
              </p>
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
              <div className="dashboard-card flex flex-col min-h-[500px]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-white">生成結果（{results.length}媒体）</p>
                  {scheduleDate && (
                    <span className="text-xs text-gold bg-gold/10 px-2 py-1 rounded flex items-center gap-1">
                      <Clock size={10} />{scheduleDate} {scheduleTime} にスケジュール予定
                    </span>
                  )}
                </div>
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
                {activeContent && (
                  <div className="flex-1 flex flex-col gap-3">
                    {activeContent.title && (
                      <div className="p-3 bg-[#12121A] rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">タイトル</p>
                        <p className="text-sm text-white font-medium">{activeContent.title}</p>
                      </div>
                    )}
                    <div className="flex-1 p-3 bg-[#12121A] rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">本文</p>
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {activeContent.content}
                      </pre>
                    </div>
                    {activeContent.hashtags && activeContent.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {activeContent.hashtags.map((tag) => (
                          <span key={tag} className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button className="flex-1 py-2 bg-gold/10 border border-gold/30 rounded-lg text-gold text-xs hover:bg-gold/20">
                        <Send size={10} className="inline mr-1" />今すぐ投稿
                      </button>
                      {scheduleDate && (
                        <button className="flex-1 py-2 bg-[#12121A] border border-[#2A2A3E] rounded-lg text-gray-400 text-xs hover:border-gold/30">
                          <Clock size={10} className="inline mr-1" />スケジュール登録
                        </button>
                      )}
                      <button className="px-3 py-2 bg-[#12121A] border border-[#2A2A3E] rounded-lg text-gray-400 text-xs hover:border-gray-500">
                        コピー
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="dashboard-card flex flex-col items-center justify-center text-center py-20">
                <Share2 size={48} className="text-gray-700 mb-4" />
                <p className="text-gray-500 text-sm">Instagram の投稿を入力して<br />「AI で全媒体コンテンツ生成」を押してください</p>
                <p className="text-gray-700 text-xs mt-3">最大{PLATFORMS.length}媒体を数秒で生成</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "schedule" && (
        <div className="space-y-4">
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-white">スケジュール済み投稿</p>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 border border-gold/30 rounded-lg text-gold text-xs hover:bg-gold/20">
                <Plus size={12} />新規追加
              </button>
            </div>
            <div className="space-y-3">
              {scheduled.map((post) => {
                const p = PLATFORMS.find((pl) => pl.id === post.platform);
                const statusConfig = {
                  pending: { label: "承認待ち", cls: "text-yellow-400 bg-yellow-500/10" },
                  approved: { label: "承認済み", cls: "text-emerald-400 bg-emerald-500/10" },
                  rejected: { label: "却下", cls: "text-red-400 bg-red-500/10" },
                  posted: { label: "投稿済み", cls: "text-blue-400 bg-blue-500/10" },
                }[post.status];
                return (
                  <div key={post.id} className="flex items-start gap-4 p-3 bg-[#12121A] rounded-lg">
                    <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: (p?.color ?? "#888") + "22", color: p?.color }}>
                      {p?.icon ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{post.content}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p?.label ?? post.platform} · {post.scheduledAt}</p>
                      {post.status === "pending" && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => updateStatus(post.id, "approved")}
                            className="px-3 py-1 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/20"
                          >
                            ✓ 承認
                          </button>
                          <button
                            onClick={() => updateStatus(post.id, "rejected")}
                            className="px-3 py-1 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20"
                          >
                            ✕ 却下
                          </button>
                        </div>
                      )}
                      {post.status === "approved" && (
                        <button
                          onClick={() => updateStatus(post.id, "posted")}
                          className="mt-2 px-3 py-1 text-xs bg-gold/10 border border-gold/30 text-gold rounded-lg hover:bg-gold/20"
                        >
                          <Send size={10} className="inline mr-1" />今すぐ投稿
                        </button>
                      )}
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${statusConfig.cls}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-3">AIおすすめ投稿時間帯</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {BEST_TIMES.map((t) => (
                <div key={t.day} className="p-3 bg-[#12121A] rounded-lg text-center">
                  <p className="text-gold text-lg font-bold">{t.day}</p>
                  <p className="text-white text-sm">{t.hour}</p>
                  <div className="mt-2 h-1.5 bg-[#2A2A3E] rounded-full overflow-hidden">
                    <div className="h-full bg-gold rounded-full" style={{ width: `${t.score}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">スコア {t.score}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLATFORMS.map((p) => (
            <div key={p.id} className="dashboard-card">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center"
                  style={{ background: p.color + "22", color: p.color }}>
                  {p.icon}
                </span>
                <p className="text-sm font-medium text-white">{p.label}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "投稿数", value: Math.floor(Math.random() * 20 + 5) },
                  { label: "リーチ", value: Math.floor(Math.random() * 5000 + 500).toLocaleString() },
                  { label: "CTR", value: `${(Math.random() * 5 + 1).toFixed(1)}%` },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-2 bg-[#12121A] rounded">
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="text-sm font-medium text-white mt-0.5">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function generateMockContent(platform: string, source: string): string {
  const base = source.replace(/#\S+/g, "").trim();
  const templates: Record<string, string> = {
    google: `【Mysサロン最新情報】\n${base.slice(0, 150)}\n\n立川駅南口徒歩2分。ご予約はHotpepperまたはLINEから。`,
    line: `こんにちは！Mysサロンです✨\n\n${base.slice(0, 200)}\n\n詳しくはプロフィールリンクからご確認ください🔗`,
    wordpress: `# ${base.slice(0, 40)}について\n\n${base}\n\n## まとめ\n\nMys（ミース）では、${base.slice(0, 60)}のサービスを提供しております。\nご予約はお気軽に。`,
    tiktok: `【動画台本】\n00:00 冒頭フック「${base.slice(0, 30)}!」\n00:05 施術ビフォー映像\n00:20 施術中のアップ\n00:40 アフター映像（BGM盛り上がり）\n00:55 「詳細はプロフへ」CTA`,
    youtube: `タイトル: 【衝撃】${base.slice(0, 30)}したらこうなった\n\n説明文:\n${base}\n\n#立川美容室 #縮毛矯正 #髪質改善`,
    x: `${base.slice(0, 120)}\n\n#立川美容室 #縮毛矯正 #髪質改善`,
    note: `# ${base.slice(0, 40)}\n\n${base}\n\n---\n\nMys（ミース）は立川の髪質改善専門サロンです。`,
  };
  return templates[platform] ?? base;
}
