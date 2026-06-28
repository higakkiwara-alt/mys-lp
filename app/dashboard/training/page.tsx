"use client";
import { useState, useEffect } from "react";
import { BookOpen, MessageSquare, Send, Loader2, Sparkles, CheckCircle2 } from "lucide-react";

type Material = { id: string; title: string; category: string; level: string; views: number; quiz: boolean };
type QA = { id: string; question: string; answer: string; category: string };

export default function TrainingPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [qa, setQa] = useState<QA[]>([]);
  const [stats, setStats] = useState<Record<string, number | string>>({});
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("技術");
  const [answering, setAnswering] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ q: string; a: string; cat: string }[]>([]);
  const [activeTab, setActiveTab] = useState<"qa" | "materials" | "create">("qa");
  const [createTopic, setCreateTopic] = useState("");
  const [createLevel, setCreateLevel] = useState("beginner");
  const [creating, setCreating] = useState(false);
  const [newMaterial, setNewMaterial] = useState<{ title: string; content: string; quiz: unknown[] } | null>(null);

  useEffect(() => {
    fetch("/api/training")
      .then((r) => r.json())
      .then((d) => { setMaterials(d.materials); setQa(d.qa); setStats(d.stats); })
      .finally(() => setLoading(false));
  }, []);

  const handleAsk = async () => {
    if (!question.trim()) return;
    const q = question;
    setQuestion("");
    setAnswering(true);
    const res = await fetch("/api/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "answer", question: q, category }),
    });
    if (res.ok) {
      const d = await res.json();
      setChatHistory((p) => [{ q, a: d.answer, cat: category }, ...p]);
    }
    setAnswering(false);
  };

  const handleCreate = async () => {
    if (!createTopic.trim()) return;
    setCreating(true);
    setNewMaterial(null);
    const res = await fetch("/api/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create-material", topic: createTopic, level: createLevel }),
    });
    if (res.ok) { const d = await res.json(); setNewMaterial(d); }
    setCreating(false);
  };

  const levelColor: Record<string, string> = { beginner: "text-emerald-400 bg-emerald-500/10", intermediate: "text-yellow-400 bg-yellow-500/10", advanced: "text-red-400 bg-red-500/10" };
  const levelLabel: Record<string, string> = { beginner: "初級", intermediate: "中級", advanced: "上級" };

  if (loading) return <div className="p-8 flex items-center gap-2 text-gray-500"><Loader2 size={16} className="animate-spin" />読み込み中...</div>;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">Staff Training OS</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">スタッフ研修 OS</h1>
        <p className="text-sm text-gray-500 mt-1">AI Q&A × 自動教材生成でスタッフの成長を加速</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "教材数", value: stats.totalMaterials, color: "text-white" },
          { label: "総閲覧数", value: stats.totalViews, color: "text-blue-400" },
          { label: "スタッフ数", value: `${stats.staffCount}名`, color: "text-purple-400" },
          { label: "平均完了率", value: `${stats.avgCompletion}%`, color: "text-emerald-400" },
        ].map((m) => (
          <div key={m.label} className="dashboard-card">
            <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-gray-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        {(["qa", "materials", "create"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm transition-all border ${activeTab === tab ? "bg-gold/20 border-gold/30 text-gold" : "bg-[#1E1E2E] border-[#2A2A3E] text-gray-400"}`}>
            {tab === "qa" ? "💬 AI Q&A" : tab === "materials" ? "📚 教材ライブラリ" : "✨ 教材生成"}
          </button>
        ))}
      </div>

      {activeTab === "qa" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="dashboard-card">
              <p className="text-sm font-medium text-white mb-3">スタッフに質問する</p>
              <div className="flex gap-2 mb-3">
                {["技術", "商材", "接客", "マーケ"].map((c) => (
                  <button key={c} onClick={() => setCategory(c)}
                    className={`px-2.5 py-1 text-xs rounded border transition-all ${category === c ? "bg-gold/20 border-gold/30 text-gold" : "bg-[#12121A] border-[#2A2A3E] text-gray-400"}`}>
                    {c}
                  </button>
                ))}
              </div>
              <textarea value={question} onChange={(e) => setQuestion(e.target.value)}
                placeholder="例: 縮毛矯正で薬が残留した場合の対処法は？"
                rows={4}
                className="w-full bg-[#12121A] border border-[#2A2A3E] rounded-lg p-3 text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-gold/50 mb-3" />
              <button onClick={handleAsk} disabled={answering || !question.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gold rounded-lg text-white text-sm font-medium hover:bg-gold-dark disabled:opacity-50">
                {answering ? <><Loader2 size={14} className="animate-spin" />回答中...</> : <><Send size={14} />AIに質問する</>}
              </button>
            </div>

            <div className="dashboard-card">
              <p className="text-sm font-medium text-white mb-3">よくある質問</p>
              <div className="space-y-2">
                {qa.map((item) => (
                  <div key={item.id} className="p-2 bg-[#12121A] rounded-lg cursor-pointer hover:border-gold/20 border border-transparent"
                    onClick={() => setQuestion(item.question)}>
                    <p className="text-xs text-gray-300">{item.question}</p>
                    <span className="text-[9px] text-gray-600">{item.category}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto dashboard-scroll">
            {answering && (
              <div className="dashboard-card">
                <div className="flex items-center gap-2 text-gray-500"><Loader2 size={12} className="animate-spin" />回答を生成中...</div>
              </div>
            )}
            {chatHistory.map((h, i) => (
              <div key={i} className="dashboard-card">
                <div className="flex items-start gap-2 mb-3">
                  <MessageSquare size={12} className="text-gray-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] bg-[#12121A] text-gray-500 px-1.5 py-0.5 rounded mr-2">{h.cat}</span>
                    <p className="text-xs text-gray-300 mt-1">{h.q}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 border-t border-[#2A2A3E] pt-3">
                  <CheckCircle2 size={12} className="text-gold shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-300 leading-relaxed">{h.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "materials" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((m) => (
            <div key={m.id} className="dashboard-card hover:border-gold/20 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${levelColor[m.level]}`}>{levelLabel[m.level]}</span>
                <span className="text-[10px] bg-[#12121A] text-gray-500 px-1.5 py-0.5 rounded">{m.category}</span>
              </div>
              <p className="text-sm font-medium text-white mb-2">{m.title}</p>
              <div className="flex items-center gap-3">
                <p className="text-xs text-gray-500">👁 {m.views}回閲覧</p>
                {m.quiz && <p className="text-xs text-gold">📝 クイズあり</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "create" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-4 flex items-center gap-2"><Sparkles size={14} className="text-gold" />AI教材生成</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">トピック</label>
                <input value={createTopic} onChange={(e) => setCreateTopic(e.target.value)}
                  placeholder="例: アルカリカラーの基本技術"
                  className="w-full bg-[#12121A] border border-[#2A2A3E] rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gold/50" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">レベル</label>
                <div className="flex gap-2">
                  {(["beginner", "intermediate", "advanced"] as const).map((l) => (
                    <button key={l} onClick={() => setCreateLevel(l)}
                      className={`flex-1 py-1.5 text-xs rounded border transition-all ${createLevel === l ? `${levelColor[l]} border-current` : "bg-[#12121A] border-[#2A2A3E] text-gray-400"}`}>
                      {levelLabel[l]}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleCreate} disabled={creating || !createTopic.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gold rounded-lg text-white font-medium hover:bg-gold-dark disabled:opacity-50">
                {creating ? <><Loader2 size={14} className="animate-spin" />生成中...</> : <><Sparkles size={14} />研修教材を生成</>}
              </button>
            </div>
          </div>

          {newMaterial && (
            <div className="dashboard-card border-l-2 border-gold overflow-y-auto max-h-[500px] dashboard-scroll">
              <p className="text-sm font-bold text-white mb-2">{newMaterial.title}</p>
              <p className="text-xs text-gray-300 whitespace-pre-wrap mb-4">{newMaterial.content}</p>
              {(newMaterial.quiz as { q: string; options: string[]; answer: string }[]).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gold mb-2">確認クイズ</p>
                  {(newMaterial.quiz as { q: string; options: string[]; answer: string }[]).map((q, i) => (
                    <div key={i} className="mb-3 p-2 bg-[#12121A] rounded-lg">
                      <p className="text-xs text-gray-300 mb-2">Q{i + 1}. {q.q}</p>
                      <div className="grid grid-cols-2 gap-1">
                        {q.options?.map((opt) => (
                          <button key={opt} className={`text-[10px] py-1 px-2 rounded border ${opt === q.answer ? "border-gold/30 bg-gold/10 text-gold" : "border-[#2A2A3E] text-gray-500"}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
