"use client";
import { useState } from "react";
import { CheckSquare, Plus, Trash2, AlertCircle, Clock, CheckCircle2 } from "lucide-react";

type Priority = "high" | "medium" | "low";
type Status = "todo" | "doing" | "done";
type Task = { id: string; title: string; priority: Priority; status: Status; tag: string; due?: string };

const INITIAL_TASKS: Task[] = [
  { id: "1", title: "口コミ新着2件にAI返信を送る", priority: "high", status: "todo", tag: "MEO", due: "今日" },
  { id: "2", title: "月曜Instagram投稿の最終確認・承認", priority: "high", status: "todo", tag: "SNS", due: "今日" },
  { id: "3", title: "失客リスク顧客12名へLINEメッセージ配信", priority: "medium", status: "todo", tag: "リテンション", due: "今週" },
  { id: "4", title: "「縮毛矯正 立川」SEO記事の入稿", priority: "medium", status: "doing", tag: "SEO" },
  { id: "5", title: "競合OCEAN TOKYOの写真投稿を分析", priority: "medium", status: "doing", tag: "競合分析" },
  { id: "6", title: "7月キャンペーンのLP文章をAI生成", priority: "low", status: "todo", tag: "コンテンツ", due: "今週" },
  { id: "7", title: "新スタッフ山田の研修材料を作成", priority: "low", status: "todo", tag: "研修" },
  { id: "8", title: "先週の口コミQRコード配布 ✓", priority: "high", status: "done", tag: "MEO" },
  { id: "9", title: "Google Business Profile 写真10枚追加 ✓", priority: "medium", status: "done", tag: "MEO" },
  { id: "10", title: "5月リテンションLINE配信 ✓", priority: "medium", status: "done", tag: "リテンション" },
];

const PRIORITY_CONFIG: Record<Priority, { label: string; cls: string }> = {
  high: { label: "重要", cls: "text-red-400 bg-red-500/10 border-red-500/20" },
  medium: { label: "通常", cls: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
  low: { label: "低", cls: "text-gray-400 bg-gray-500/10 border-gray-500/20" },
};

const COLUMNS: { key: Status; label: string; icon: React.ElementType; color: string }[] = [
  { key: "todo", label: "未着手", icon: AlertCircle, color: "text-gray-400" },
  { key: "doing", label: "進行中", icon: Clock, color: "text-yellow-400" },
  { key: "done", label: "完了", icon: CheckCircle2, color: "text-emerald-400" },
];

const TAG_COLORS: Record<string, string> = {
  "MEO": "bg-blue-500/10 text-blue-400",
  "SNS": "bg-pink-500/10 text-pink-400",
  "SEO": "bg-emerald-500/10 text-emerald-400",
  "競合分析": "bg-orange-500/10 text-orange-400",
  "リテンション": "bg-purple-500/10 text-purple-400",
  "コンテンツ": "bg-cyan-500/10 text-cyan-400",
  "研修": "bg-indigo-500/10 text-indigo-400",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");

  const move = (id: string, status: Status) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
  };

  const remove = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    const task: Task = {
      id: Date.now().toString(),
      title: newTask.trim(),
      priority: newPriority,
      status: "todo",
      tag: "その他",
    };
    setTasks((prev) => [task, ...prev]);
    setNewTask("");
  };

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <CheckSquare size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">Task Board</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">タスク管理</h1>
        <p className="text-sm text-gray-500 mt-1">サロン運営のToDoをKanban形式で管理</p>
      </div>

      {/* Add task */}
      <div className="flex gap-2 mb-8">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="新しいタスクを入力..."
          className="flex-1 bg-[#1E1E2E] border border-[#2A2A3E] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold/50"
        />
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value as Priority)}
          className="bg-[#1E1E2E] border border-[#2A2A3E] rounded-xl px-3 py-2.5 text-sm text-gray-400 focus:outline-none focus:border-gold/50"
        >
          <option value="high">重要</option>
          <option value="medium">通常</option>
          <option value="low">低</option>
        </select>
        <button
          onClick={addTask}
          className="flex items-center gap-2 px-4 py-2.5 bg-gold/10 border border-gold/30 rounded-xl text-gold text-sm hover:bg-gold/20"
        >
          <Plus size={14} />追加
        </button>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="dashboard-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <col.icon size={14} className={col.color} />
                  <p className="text-sm font-medium text-white">{col.label}</p>
                  <span className="text-xs text-gray-600 bg-[#12121A] px-2 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {colTasks.map((task) => {
                  const pCfg = PRIORITY_CONFIG[task.priority];
                  return (
                    <div key={task.id} className="bg-[#12121A] border border-[#2A2A3E] rounded-xl p-3 group">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className={`text-sm text-white leading-snug flex-1 ${task.status === "done" ? "line-through text-gray-500" : ""}`}>
                          {task.title}
                        </p>
                        <button onClick={() => remove(task.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 shrink-0">
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${pCfg.cls}`}>{pCfg.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${TAG_COLORS[task.tag] ?? "bg-gray-500/10 text-gray-400"}`}>{task.tag}</span>
                        {task.due && <span className="text-[10px] text-gray-600">{task.due}</span>}
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        {col.key !== "todo" && (
                          <button onClick={() => move(task.id, "todo")} className="text-[10px] text-gray-500 hover:text-white">← 戻す</button>
                        )}
                        {col.key === "todo" && (
                          <button onClick={() => move(task.id, "doing")} className="text-[10px] text-yellow-400 hover:text-yellow-300">着手 →</button>
                        )}
                        {col.key === "doing" && (
                          <button onClick={() => move(task.id, "done")} className="text-[10px] text-emerald-400 hover:text-emerald-300">完了 →</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
