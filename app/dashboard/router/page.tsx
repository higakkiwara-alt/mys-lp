"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Bot, CheckCircle2, Clock, AlertCircle, DollarSign, RefreshCw,
  ThumbsUp, ThumbsDown, RotateCcw, ChevronDown, ChevronUp, FolderGit2,
} from "lucide-react";

type PlanStep = { name: string; kind: string; agent: string; model?: string };
type Run = {
  id: string;
  input: string;
  title: string | null;
  source: string;
  status: string;
  resultSummary: string | null;
  plan: { steps: PlanStep[]; approvalReason?: string; estimatedUsd: number; promptId?: string } | null;
  currentStep: number;
  costUsd: string | number;
  estimatedUsd: string | number | null;
  durationMs: number | null;
  obsidianPath: string | null;
  error: string | null;
  createdAt: string;
};
type Stats = {
  today: { count: number; costUsd: number };
  month: { count: number; costUsd: number };
  byModel: Array<{ model: string; calls: number; costUsd: number }>;
};

const STEP_LABEL: Record<string, string> = {
  classify: "分類", think: "方針整理", write: "本文作成", image_prompt: "画像・動画案",
  qa: "品質チェック", approval: "承認", publish: "投稿", search: "検索",
  knowledge: "知識整理", tasks: "タスク化", create_text: "文章作成", create_code: "実装定義",
  create_image: "画像案", create_video: "動画案", data: "データ", automation: "自動化", manage: "整理",
};
const SOURCE_LABEL: Record<string, string> = { voice: "🎤音声", line: "💬LINE", web: "🖥Web", n8n: "⚙n8n", cron: "⏰定期" };

function usd(v: string | number | null | undefined): string {
  return `$${Number(v ?? 0).toFixed(3)}`;
}

export default function RouterDashboard() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [weeklyReview, setWeeklyReview] = useState<{ date: string; report: string } | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, string>>({});
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/router/runs?limit=100");
      if (!res.ok) return;
      const data = await res.json();
      setRuns(data.runs ?? []);
      setStats(data.stats ?? null);
      setWeeklyReview(data.weeklyReview ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const toggleExpand = async (id: string) => {
    if (expanded === id) return setExpanded(null);
    setExpanded(id);
    if (!detail[id]) {
      const res = await fetch(`/api/router/runs/${id}`);
      if (res.ok) {
        const run = await res.json();
        const steps = (run.steps ?? []) as Array<{ name: string; output: string | null }>;
        const gen = [...steps].reverse().find((s) => s.output && !["classify", "qa", "approval"].includes(s.name));
        setDetail((d) => ({ ...d, [id]: gen?.output ?? "(プレビューなし)" }));
      }
    }
  };

  const act = async (id: string, action: "approve" | "reject" | "retry", note?: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/router/runs/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note, by: "web" }),
      });
      const data = await res.json();
      setToast(data.output ?? data.error ?? "操作しました");
      setTimeout(() => setToast(null), 4000);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const waiting = runs.filter((r) => r.status === "waiting_approval");
  const active = runs.filter((r) => r.status === "queued" || r.status === "running");
  const errors = runs.filter((r) => r.status === "error");
  const done = runs.filter((r) => r.status === "done").slice(0, 20);

  const RunHeader = ({ r }: { r: Run }) => (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm text-white font-medium truncate">{r.title ?? r.input.slice(0, 40)}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {SOURCE_LABEL[r.source] ?? r.source} ・ {new Date(r.createdAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          {" ・ "}実コスト {usd(r.costUsd)}（見積 {usd(r.estimatedUsd)}）
        </p>
        {r.plan && (
          <p className="text-[10px] text-gray-600 mt-1 truncate">
            {r.plan.steps.map((s, i) => (
              <span key={i} className={i < r.currentStep ? "text-emerald-500" : ""}>
                {i > 0 && " → "}
                {STEP_LABEL[s.name] ?? s.name}
              </span>
            ))}
          </p>
        )}
      </div>
      <button onClick={() => toggleExpand(r.id)} className="text-gray-500 hover:text-white shrink-0 p-1">
        {expanded === r.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
    </div>
  );

  const Preview = ({ r }: { r: Run }) =>
    expanded === r.id ? (
      <pre className="mt-2 p-3 bg-black/30 rounded text-[11px] text-gray-300 whitespace-pre-wrap max-h-72 overflow-y-auto dashboard-scroll">
        {detail[r.id] ?? "読み込み中..."}
      </pre>
    ) : null;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg text-white font-medium flex items-center gap-2">
            <Bot size={18} className="text-gold" /> AI Router（AI COO）
          </h1>
          <p className="text-xs text-gray-500 mt-1">承認キュー・実行ログ・コスト管理</p>
        </div>
        <button onClick={load} className="p-2 text-gray-500 hover:text-white" title="更新">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {toast && (
        <div className="p-3 bg-gold/10 border border-gold/30 rounded text-xs text-gold whitespace-pre-wrap">{toast}</div>
      )}

      {/* 統計カード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-[#13131F] border border-[#1E1E2E] rounded-lg">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">今日</p>
          <p className="text-xl text-white mt-1">{usd(stats?.today.costUsd)}</p>
          <p className="text-[11px] text-gray-500">{stats?.today.count ?? 0} 件実行</p>
        </div>
        <div className="p-4 bg-[#13131F] border border-[#1E1E2E] rounded-lg">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">今月</p>
          <p className="text-xl text-white mt-1">{usd(stats?.month.costUsd)}</p>
          <p className="text-[11px] text-gray-500">{stats?.month.count ?? 0} 件実行</p>
        </div>
        <div className="p-4 bg-[#13131F] border border-[#1E1E2E] rounded-lg col-span-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <DollarSign size={10} /> 使用AI（今月）
          </p>
          <div className="mt-1 space-y-0.5">
            {(stats?.byModel ?? []).map((m) => (
              <div key={m.model} className="flex justify-between text-[11px]">
                <span className="text-gray-400">{m.model} × {m.calls}</span>
                <span className="text-gray-300">{usd(m.costUsd)}</span>
              </div>
            ))}
            {!stats?.byModel?.length && <p className="text-[11px] text-gray-600">まだ実行がありません</p>}
          </div>
        </div>
      </div>

      {/* 今週の改善提案（Reviewer Agent 週次自動生成） */}
      {weeklyReview && (
        <section className="p-4 bg-[#13131F] border border-gold/20 rounded-lg">
          <button onClick={() => setShowReview(!showReview)} className="w-full flex items-center justify-between">
            <span className="text-xs text-gold uppercase tracking-wider">
              📊 今週の改善提案（{weeklyReview.date}・Reviewer Agent）
            </span>
            {showReview ? <ChevronUp size={14} className="text-gold" /> : <ChevronDown size={14} className="text-gold" />}
          </button>
          {showReview && (
            <pre className="mt-3 text-[11px] text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto dashboard-scroll">
              {weeklyReview.report}
            </pre>
          )}
        </section>
      )}

      {/* 承認待ち */}
      <section>
        <h2 className="text-xs text-yellow-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <Clock size={12} /> 承認待ち（{waiting.length}）
        </h2>
        <div className="space-y-2">
          {waiting.map((r) => (
            <div key={r.id} className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
              <RunHeader r={r} />
              {r.plan?.approvalReason && (
                <p className="text-[11px] text-yellow-400/80 mt-1">理由: {r.plan.approvalReason}</p>
              )}
              <Preview r={r} />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  disabled={busy === r.id}
                  onClick={() => act(r.id, "approve")}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded text-xs hover:bg-emerald-500/25 disabled:opacity-50"
                >
                  <ThumbsUp size={12} /> 承認して実行
                </button>
                <input
                  value={rejectNote[r.id] ?? ""}
                  onChange={(e) => setRejectNote((s) => ({ ...s, [r.id]: e.target.value }))}
                  placeholder="修正指示（空なら中止）"
                  className="flex-1 min-w-40 px-2 py-1.5 bg-black/30 border border-[#1E1E2E] rounded text-xs text-white placeholder:text-gray-600"
                />
                <button
                  disabled={busy === r.id}
                  onClick={() => act(r.id, "reject", rejectNote[r.id])}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-xs hover:bg-red-500/20 disabled:opacity-50"
                >
                  <ThumbsDown size={12} /> {rejectNote[r.id]?.trim() ? "修正して再生成" : "却下（中止）"}
                </button>
              </div>
            </div>
          ))}
          {!waiting.length && <p className="text-[11px] text-gray-600 px-1">承認待ちはありません</p>}
        </div>
      </section>

      {/* 実行中 */}
      <section>
        <h2 className="text-xs text-blue-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <RefreshCw size={12} /> 実行中・待機中（{active.length}）
        </h2>
        <div className="space-y-2">
          {active.map((r) => (
            <div key={r.id} className="p-3 bg-[#13131F] border border-[#1E1E2E] rounded-lg">
              <RunHeader r={r} />
              <Preview r={r} />
            </div>
          ))}
          {!active.length && <p className="text-[11px] text-gray-600 px-1">実行中のタスクはありません</p>}
        </div>
      </section>

      {/* エラー */}
      {errors.length > 0 && (
        <section>
          <h2 className="text-xs text-red-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <AlertCircle size={12} /> エラー（{errors.length}）
          </h2>
          <div className="space-y-2">
            {errors.map((r) => (
              <div key={r.id} className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                <RunHeader r={r} />
                <p className="text-[11px] text-red-400/80 mt-1 break-all">{r.error}</p>
                <Preview r={r} />
                <button
                  disabled={busy === r.id}
                  onClick={() => act(r.id, "retry")}
                  className="mt-2 flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-xs hover:bg-blue-500/20 disabled:opacity-50"
                >
                  <RotateCcw size={12} /> 再実行
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 完了 */}
      <section>
        <h2 className="text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <CheckCircle2 size={12} /> 完了（直近{done.length}件）
        </h2>
        <div className="space-y-2">
          {done.map((r) => (
            <div key={r.id} className="p-3 bg-[#13131F] border border-[#1E1E2E] rounded-lg">
              <RunHeader r={r} />
              {r.obsidianPath && (
                <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                  <FolderGit2 size={10} /> {r.obsidianPath}
                </p>
              )}
              {expanded === r.id && (
                <pre className="mt-2 p-3 bg-black/30 rounded text-[11px] text-gray-300 whitespace-pre-wrap max-h-72 overflow-y-auto dashboard-scroll">
                  {r.resultSummary ?? detail[r.id] ?? ""}
                </pre>
              )}
            </div>
          ))}
          {!done.length && <p className="text-[11px] text-gray-600 px-1">完了タスクはまだありません</p>}
        </div>
      </section>
    </div>
  );
}
