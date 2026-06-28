"use client";
import { useState } from "react";
import {
  Users, Sparkles, Loader2, CheckCircle2, Clock, Star,
  ChevronRight, MessageSquare, FileText, Send, Brain
} from "lucide-react";

const STAGES = [
  { id: "lp", label: "求人LP", status: "active" },
  { id: "instagram", label: "Instagram", status: "active" },
  { id: "tiktok", label: "TikTok", status: "active" },
  { id: "line", label: "LINE応募", status: "active" },
  { id: "interview", label: "面接予約", status: "active" },
  { id: "aptitude", label: "適性診断", status: "active" },
  { id: "evaluation", label: "面接評価", status: "active" },
  { id: "hire", label: "採用決定", status: "active" },
];

const APPLICANTS = [
  {
    id: "1", name: "田中 美咲", age: 22, status: "interview",
    score: 88, applied: "2026-06-26", school: "東京美容専門学校",
    message: "髪質改善に興味があり、Mysさんのインスタを見て応募しました。",
    aptitude: { creativity: 90, service: 88, teamwork: 82, growth: 95 },
  },
  {
    id: "2", name: "山田 彩花", age: 24, status: "screening",
    score: 76, applied: "2026-06-25", school: "HAB 大阪美容専門学校",
    message: "縮毛矯正の技術を極めたいと思っています。",
    aptitude: { creativity: 75, service: 85, teamwork: 90, growth: 78 },
  },
  {
    id: "3", name: "鈴木 光", age: 21, status: "hired",
    score: 94, applied: "2026-06-20", school: "テクノ・ホルティ園芸専門学校",
    message: "前職でも美容室でアシスタントをしていました。",
    aptitude: { creativity: 95, service: 92, teamwork: 88, growth: 96 },
  },
];

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  screening: { label: "書類選考", color: "text-blue-400", bg: "bg-blue-500/10" },
  interview: { label: "面接待ち", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  hired: { label: "採用決定", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  rejected: { label: "不採用", color: "text-gray-500", bg: "bg-gray-500/10" },
};

type Applicant = typeof APPLICANTS[0];

function AptitudeBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[#1E1E2E] rounded-full overflow-hidden">
        <div
          className="h-full bg-gold rounded-full"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{value}</span>
    </div>
  );
}

function ApplicantCard({ applicant }: { applicant: Applicant }) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiEval, setAiEval] = useState("");
  const status = STATUS_MAP[applicant.status];

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 1800));
    setAiEval(
      `【AI評価レポート】${applicant.name}さん（${applicant.age}歳）\n\n` +
      `総合スコア: ${applicant.score}/100\n\n` +
      `強み:\n・成長意欲が特に高い（${applicant.aptitude.growth}点）\n` +
      `・接客サービス感が優れている\n\n` +
      `懸念点:\n・チームワーク面は平均的。入社後のフォローが必要。\n\n` +
      `採用推奨度: ${applicant.score >= 85 ? "★★★★★ 強く推奨" : "★★★★ 推奨"}\n\n` +
      `面接で確認すべき質問:\n1. 将来のキャリアビジョンは？\n2. 苦手なお客様への対処法は？\n3. 縮毛矯正の経験年数は？`
    );
    setGenerating(false);
  };

  return (
    <div className="dashboard-card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center text-gold font-bold">
            {applicant.name[0]}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{applicant.name} ({applicant.age}歳)</p>
            <p className="text-xs text-gray-500">{applicant.school} · 応募: {applicant.applied}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-lg font-bold text-white">{applicant.score}</p>
            <p className="text-[10px] text-gray-500">AI スコア</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded ${status.bg} ${status.color}`}>{status.label}</span>
        </div>
      </div>

      <p className="text-xs text-gray-400 bg-[#12121A] p-2 rounded mb-3 italic">「{applicant.message}」</p>

      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gold mb-3">
        <ChevronRight size={12} className={`transition-transform ${open ? "rotate-90" : ""}`} />
        適性診断スコア
      </button>

      {open && (
        <div className="space-y-2 mb-3">
          <AptitudeBar label="創造性" value={applicant.aptitude.creativity} />
          <AptitudeBar label="サービス" value={applicant.aptitude.service} />
          <AptitudeBar label="チームワーク" value={applicant.aptitude.teamwork} />
          <AptitudeBar label="成長意欲" value={applicant.aptitude.growth} />
        </div>
      )}

      {aiEval ? (
        <div className="bg-[#12121A] border-l-2 border-gold rounded-lg p-3 mb-3">
          <p className="text-xs text-gold mb-1">AI 評価レポート</p>
          <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{aiEval}</pre>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 py-2 bg-[#12121A] border border-[#2A2A3E] hover:border-gold/40 rounded-lg text-xs text-gray-400 hover:text-white"
        >
          {generating ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} className="text-gold" />}
          AI 評価レポートを生成
        </button>
      )}

      {applicant.status !== "hired" && (
        <div className="flex gap-2 mt-2">
          <button className="flex-1 py-1.5 bg-gold/10 border border-gold/30 text-gold text-xs rounded hover:bg-gold/20">
            面接予約メール送信
          </button>
          <button className="flex-1 py-1.5 bg-[#12121A] border border-[#2A2A3E] text-gray-400 text-xs rounded">
            LINE で連絡
          </button>
        </div>
      )}
    </div>
  );
}

export default function RecruitPage() {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [activeTab, setActiveTab] = useState<"pipeline" | "applicants" | "content">("pipeline");

  const handleGenerateLp = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 2500));
    setGenerating(false);
    setGenerated(true);
  };

  const stats = [
    { label: "今月の応募数", value: "8名" },
    { label: "書類通過率", value: "63%" },
    { label: "面接設定率", value: "80%" },
    { label: "採用決定", value: "1名" },
  ];

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Users size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">AI Recruit Machine</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">採用フル自動化</h1>
        <p className="text-sm text-gray-500 mt-1">求人LP → SNS → 応募 → 適性診断 → 面接 → 採用まで全てAI</p>
      </div>

      {/* Pipeline visualization */}
      <div className="dashboard-card mb-6 overflow-x-auto">
        <p className="text-sm font-medium text-white mb-4">採用パイプライン</p>
        <div className="flex items-center gap-0 min-w-max">
          {STAGES.map((stage, i) => (
            <div key={stage.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-gold/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={14} className="text-gold" />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 text-center whitespace-nowrap">{stage.label}</p>
              </div>
              {i < STAGES.length - 1 && <div className="w-8 h-0.5 bg-gold/30 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="dashboard-card text-center">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["pipeline", "applicants", "content"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              activeTab === tab ? "bg-gold/20 text-gold border border-gold/30" : "bg-[#1E1E2E] text-gray-400 border border-[#2A2A3E]"
            }`}
          >
            {tab === "pipeline" ? "応募者管理" : tab === "applicants" ? `選考中 (${APPLICANTS.filter(a => a.status !== "hired").length}名)` : "採用コンテンツ生成"}
          </button>
        ))}
      </div>

      {activeTab === "pipeline" && (
        <div className="space-y-4">
          {APPLICANTS.map((a) => <ApplicantCard key={a.id} applicant={a} />)}
        </div>
      )}

      {activeTab === "applicants" && (
        <div className="space-y-4">
          {APPLICANTS.filter(a => a.status !== "hired").map((a) => <ApplicantCard key={a.id} applicant={a} />)}
        </div>
      )}

      {activeTab === "content" && (
        <div className="space-y-4">
          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-4">AI 求人コンテンツ生成</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: "求人 LP", desc: "応募フォーム付きのランディングページを生成", icon: FileText },
                { title: "Instagram 求人投稿", desc: "スタッフの働く様子を訴求する投稿", icon: Star },
                { title: "TikTok 求人動画台本", desc: "「1日密着」「給与公開」などのバズりやすい構成", icon: MessageSquare },
                { title: "LINE 募集メッセージ", desc: "公式アカウントからの求人告知文", icon: Send },
              ].map(({ title, desc, icon: Icon }) => (
                <div key={title} className="p-4 bg-[#12121A] rounded-xl border border-[#2A2A3E] hover:border-gold/30 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={14} className="text-gold" />
                    <p className="text-sm font-medium text-white">{title}</p>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{desc}</p>
                  <button
                    onClick={handleGenerateLp}
                    disabled={generating}
                    className="flex items-center gap-1 text-xs text-gold hover:text-gold-light"
                  >
                    {generating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                    AI で生成
                  </button>
                </div>
              ))}
            </div>
          </div>

          {generated && (
            <div className="dashboard-card border-l-2 border-gold">
              <p className="text-xs text-gold mb-2">生成されたInstagram求人投稿</p>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
{`✨ 一緒に働きませんか？Mys（ミース）スタッフ募集中！

髪質改善・縮毛矯正に特化した立川の専門サロンMysでは、
ともに技術を磨くスタイリストを募集しています。

【こんな方を求めています】
・髪質改善の技術を極めたい方
・お客様の髪の悩みを根本から解決したい方
・チームで成長できる環境を求めている方

【働く環境】
✅ 技術研修制度あり
✅ 完全週休2日制
✅ 住宅手当・交通費全額支給
✅ Instagram運用サポート

詳細はプロフィールのリンクから、
またはDMでお気軽にお問い合わせください💌

#美容師求人 #立川美容室 #髪質改善 #スタイリスト募集`}
              </pre>
              <div className="flex gap-2 mt-3">
                <button className="px-3 py-1.5 bg-gold/10 border border-gold/30 text-gold text-xs rounded">
                  Instagramに投稿
                </button>
                <button className="px-3 py-1.5 bg-[#1E1E2E] border border-[#2A2A3E] text-gray-400 text-xs rounded">
                  コピー
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
