"use client";
import { useState, useEffect } from "react";
import { MessageSquare, Send, Loader2, Bot, User, TrendingUp } from "lucide-react";

type Inquiry = {
  id: string;
  channel: string;
  message: string;
  createdAt: string;
  replied: boolean;
  response: string | null;
};

export default function SalesCloserPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [stats, setStats] = useState<{ totalInquiries: number; autoReplied: number; conversionRate: number; avgResponseTime: string; topChannels: { channel: string; count: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState("web");
  const [sending, setSending] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant"; text: string }[]>([]);

  useEffect(() => {
    fetch("/api/sales")
      .then((r) => r.json())
      .then((d) => { setInquiries(d.inquiries); setStats(d.stats); })
      .finally(() => setLoading(false));
  }, []);

  const handleSend = async () => {
    if (!message.trim()) return;
    const userMsg = message;
    setChatHistory((p) => [...p, { role: "user", text: userMsg }]);
    setMessage("");
    setSending(true);
    setReply(null);
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMsg, channel }),
    });
    if (res.ok) {
      const d = await res.json();
      setReply(d.reply);
      setChatHistory((p) => [...p, { role: "assistant", text: d.reply }]);
    }
    setSending(false);
  };

  if (loading) return <div className="p-8 flex items-center gap-2 text-gray-500"><Loader2 size={16} className="animate-spin" />読み込み中...</div>;

  const channelEmoji: Record<string, string> = { instagram: "📸", line: "💬", web: "🌐" };

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Bot size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">24/7 Sales Closer</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">24時間AIセールスクローザー</h1>
        <p className="text-sm text-gray-500 mt-1">深夜・休日でも即時返信で予約転換率を高める</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "今月の問い合わせ", value: stats?.totalInquiries, color: "text-white" },
          { label: "自動返信数", value: stats?.autoReplied, color: "text-blue-400" },
          { label: "予約転換率", value: `${stats?.conversionRate}%`, color: "text-emerald-400" },
          { label: "平均返信時間", value: stats?.avgResponseTime, color: "text-gold" },
        ].map((m) => (
          <div key={m.label} className="dashboard-card">
            <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-gray-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dashboard-card">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={14} className="text-gold" />
            <p className="text-sm font-medium text-white">AIテスト送信</p>
          </div>
          <div className="flex gap-2 mb-3">
            {["web", "instagram", "line"].map((c) => (
              <button key={c} onClick={() => setChannel(c)}
                className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all ${channel === c ? "bg-gold/20 border-gold/30 text-gold" : "bg-[#12121A] border-[#2A2A3E] text-gray-400"}`}>
                {channelEmoji[c]} {c}
              </button>
            ))}
          </div>

          <div className="min-h-40 max-h-64 overflow-y-auto space-y-2 mb-3 p-2 bg-[#12121A] rounded-lg">
            {chatHistory.length === 0 && (
              <p className="text-xs text-gray-600 text-center py-8">問い合わせメッセージを入力してテストできます</p>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && <Bot size={12} className="text-gold shrink-0 mt-0.5" />}
                <div className={`max-w-[80%] px-3 py-2 rounded-lg text-xs ${msg.role === "user" ? "bg-gold/20 text-gold" : "bg-[#1E1E2E] text-gray-300"}`}>
                  {msg.text}
                </div>
                {msg.role === "user" && <User size={12} className="text-gray-500 shrink-0 mt-0.5" />}
              </div>
            ))}
            {sending && (
              <div className="flex gap-2">
                <Bot size={12} className="text-gold shrink-0 mt-0.5" />
                <div className="bg-[#1E1E2E] px-3 py-2 rounded-lg"><Loader2 size={10} className="animate-spin text-gold" /></div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input value={message} onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="「縮毛矯正の値段は？」など問い合わせ内容を入力"
              className="flex-1 bg-[#12121A] border border-[#2A2A3E] rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gold/50" />
            <button onClick={handleSend} disabled={sending || !message.trim()}
              className="px-3 py-2 bg-gold rounded-lg text-white disabled:opacity-50 hover:bg-gold-dark">
              <Send size={12} />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-3 flex items-center gap-2"><TrendingUp size={14} className="text-gold" />チャンネル別件数</p>
            {stats?.topChannels.map((c) => (
              <div key={c.channel} className="flex items-center gap-3 mb-2">
                <span className="text-xs text-gray-400 w-20">{channelEmoji[c.channel.toLowerCase()]} {c.channel}</span>
                <div className="flex-1 h-2 bg-[#12121A] rounded-full">
                  <div className="h-2 rounded-full bg-gold" style={{ width: `${(c.count / (stats?.totalInquiries ?? 1)) * 100}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-6">{c.count}</span>
              </div>
            ))}
          </div>

          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-3">最近の問い合わせ</p>
            <div className="space-y-2">
              {inquiries.map((inq) => (
                <div key={inq.id} className="p-2 bg-[#12121A] rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px]">{channelEmoji[inq.channel] ?? "💬"}</span>
                    <span className="text-[10px] text-gray-500">{inq.createdAt}</span>
                    <span className={`text-[9px] px-1 py-0.5 rounded ml-auto ${inq.replied ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                      {inq.replied ? "返信済" : "対応中"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300">{inq.message}</p>
                  {inq.response && <p className="text-xs text-gray-500 mt-1 border-l-2 border-gold/30 pl-2">{inq.response}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
