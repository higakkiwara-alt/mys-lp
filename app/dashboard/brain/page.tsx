"use client";
import { useState } from "react";
import { Brain, Search, Plus, Mic, FileText, MessageSquare, Image, Lightbulb, Tag, Loader2, Sparkles } from "lucide-react";

const BRAIN_TYPES = [
  { id: "VOICE_MEMO", label: "音声メモ", icon: Mic, color: "text-purple-400" },
  { id: "MEETING", label: "議事録", icon: FileText, color: "text-blue-400" },
  { id: "MANUAL", label: "マニュアル", icon: FileText, color: "text-green-400" },
  { id: "LINE_MESSAGE", label: "LINE", icon: MessageSquare, color: "text-emerald-400" },
  { id: "IMAGE_DESC", label: "画像説明", icon: Image, color: "text-pink-400" },
  { id: "AI_PROPOSAL", label: "AI提案", icon: Lightbulb, color: "text-yellow-400" },
  { id: "CUSTOMER_CARD", label: "カルテ", icon: FileText, color: "text-orange-400" },
  { id: "STRATEGY", label: "戦略", icon: Lightbulb, color: "text-gold" },
];

const MOCK_ENTRIES = [
  {
    id: "1",
    title: "縮毛矯正の新薬剤テスト結果",
    type: "VOICE_MEMO",
    content: "新しい薬剤（X社製）を試したところ、ダメージが従来比30%減少。特に軟毛のお客様に効果的。来月から本格導入を検討。",
    tags: ["薬剤", "縮毛矯正", "改善"],
    date: "2026-06-27",
  },
  {
    id: "2",
    title: "スタッフMTG 06/25 議事録",
    type: "MEETING",
    content: "・新メニュー「サマーケアプラン」を7月から導入\n・Instagram 投稿頻度を週5回に増加\n・口コミ促進のためのQRコードスタンドを発注",
    tags: ["MTG", "戦略", "Instagram"],
    date: "2026-06-25",
  },
  {
    id: "3",
    title: "A様カルテ - 縮毛矯正3回目",
    type: "CUSTOMER_CARD",
    content: "髪質: 軟毛・多毛。前回から4ヶ月経過。仕上がりに大変満足。次回は9月予定。ホームケアにLUSTRE使用中。",
    tags: ["カルテ", "リピーター"],
    date: "2026-06-20",
  },
];

type BrainEntry = typeof MOCK_ENTRIES[0];

export default function BrainPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [searching, setSearching] = useState(false);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("VOICE_MEMO");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"entries" | "query" | "add">("entries");

  const filtered = MOCK_ENTRIES.filter((e) => {
    const matchType = !activeType || e.type === activeType;
    const matchSearch = !search || e.title.includes(search) || e.content.includes(search);
    return matchType && matchSearch;
  });

  const handleQuery = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setAnswer("");
    await new Promise((r) => setTimeout(r, 2000));
    setAnswer(
      `「${query}」に関連する情報をCompany Brainから検索しました。\n\n` +
      `【スタッフMTG 06/25】縮毛矯正関連の戦略について議論しました。新メニューの導入が決定しています。\n\n` +
      `【薬剤テスト結果 06/27】新薬剤のテストで良好な結果が出ています。詳細はボイスメモを参照。\n\n` +
      `APIキーを設定すると、Claudeが実際のナレッジベースを参照して精度の高い回答を生成します。`
    );
    setSearching(false);
  };

  const handleSave = async () => {
    if (!newTitle || !newContent) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    setNewTitle("");
    setNewContent("");
    alert("Company Brain に保存しました（デモ）");
  };

  const getBrainType = (id: string) => BRAIN_TYPES.find((t) => t.id === id);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Brain size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">Company Brain</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">会社の知識データベース</h1>
        <p className="text-sm text-gray-500 mt-1">音声・会議・マニュアル・LINEをすべてAIで検索可能に</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "総エントリ数", value: "47" },
          { label: "今月追加", value: "12" },
          { label: "カルテ数", value: "156" },
          { label: "マニュアル数", value: "8" },
        ].map((s) => (
          <div key={s.label} className="dashboard-card text-center">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["entries", "query", "add"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              activeTab === tab ? "bg-gold/20 text-gold border border-gold/30" : "bg-[#1E1E2E] text-gray-400 border border-[#2A2A3E]"
            }`}
          >
            {tab === "entries" ? "エントリ一覧" : tab === "query" ? "AI に質問" : "新規追加"}
          </button>
        ))}
      </div>

      {activeTab === "entries" && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="エントリを検索..."
                className="w-full bg-[#1E1E2E] border border-[#2A2A3E] rounded-lg pl-9 pr-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gold/50"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveType(null)}
                className={`px-3 py-2 rounded-lg text-xs whitespace-nowrap ${!activeType ? "bg-gold/20 text-gold border border-gold/30" : "bg-[#1E1E2E] text-gray-500 border border-[#2A2A3E]"}`}
              >
                全て
              </button>
              {BRAIN_TYPES.slice(0, 4).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveType(activeType === t.id ? null : t.id)}
                  className={`px-3 py-2 rounded-lg text-xs whitespace-nowrap ${activeType === t.id ? "bg-gold/20 text-gold border border-gold/30" : "bg-[#1E1E2E] text-gray-500 border border-[#2A2A3E]"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map((entry) => {
              const type = getBrainType(entry.type);
              const Icon = type?.icon ?? FileText;
              return (
                <div key={entry.id} className="dashboard-card hover:border-gold/20 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#12121A] rounded-lg flex items-center justify-center shrink-0">
                      <Icon size={14} className={type?.color ?? "text-gray-400"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-white truncate">{entry.title}</p>
                        <span className="text-xs text-gray-600 shrink-0">{entry.date}</span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{entry.content}</p>
                      <div className="flex gap-1 mt-2">
                        {entry.tags.map((tag) => (
                          <span key={tag} className="text-[10px] text-gray-500 bg-[#12121A] px-2 py-0.5 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "query" && (
        <div className="space-y-4">
          <div className="dashboard-card">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-gold" />
              <p className="text-sm font-medium text-white">Company Brain に質問する</p>
            </div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="例：縮毛矯正の薬剤について最新の情報は？　または　A様の施術履歴を教えて"
              rows={4}
              className="w-full bg-[#12121A] border border-[#2A2A3E] rounded-lg p-3 text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-gold/50 mb-3"
            />
            <button
              onClick={handleQuery}
              disabled={searching || !query.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-gold rounded-lg text-white text-sm hover:bg-gold-dark disabled:opacity-50"
            >
              {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Brain を検索
            </button>
          </div>
          {answer && (
            <div className="dashboard-card border-l-2 border-gold">
              <p className="text-xs text-gold mb-2">AI の回答</p>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{answer}</pre>
            </div>
          )}
        </div>
      )}

      {activeTab === "add" && (
        <div className="dashboard-card">
          <p className="text-sm font-medium text-white mb-4">新規エントリを追加</p>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">種別</label>
              <div className="flex flex-wrap gap-2">
                {BRAIN_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setNewType(t.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        newType === t.id ? "bg-gold/20 border-gold/40 text-gold" : "bg-[#12121A] border-[#2A2A3E] text-gray-400"
                      }`}
                    >
                      <Icon size={12} className={newType === t.id ? "text-gold" : t.color} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">タイトル</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="エントリのタイトル"
                className="w-full bg-[#12121A] border border-[#2A2A3E] rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gold/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">内容</label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="内容を入力..."
                rows={6}
                className="w-full bg-[#12121A] border border-[#2A2A3E] rounded-lg p-3 text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-gold/50"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !newTitle || !newContent}
              className="flex items-center gap-2 px-4 py-2 bg-gold rounded-lg text-white text-sm hover:bg-gold-dark disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Brain に保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
