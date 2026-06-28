"use client";
import { useState } from "react";
import { MapPin, Star, MessageSquare, Image, Plus, Loader2, CheckCircle2, Clock, Sparkles } from "lucide-react";

const MOCK_REVIEWS = [
  { id: "1", author: "山田 花子", rating: 5, text: "縮毛矯正が本当に上手で、仕上がりがとても自然でした。スタッフの方も親切で、また来たいと思います！", date: "2026-06-27", replied: false },
  { id: "2", author: "鈴木 太郎", rating: 4, text: "丁寧なカウンセリングがよかったです。少し待ち時間が長かったですが、仕上がりには満足しています。", date: "2026-06-25", replied: true, reply: "この度はご来店ありがとうございます！お待たせしてしまい申し訳ございませんでした。またのご来店をお待ちしております。" },
  { id: "3", author: "田中 みき", rating: 5, text: "3ヶ月通い続けて、髪質が劇的に変わりました。ホームケアのアドバイスも丁寧で、毎朝のスタイリングが楽になりました！", date: "2026-06-24", replied: false },
];

const MOCK_POSTS = [
  { id: "1", content: "【夏のキャンペーン開催中】縮毛矯正+トリートメントで梅雨のうねりをサラサラに。6月末まで10%オフ！", date: "2026-06-20", status: "published" },
  { id: "2", content: "新スタッフ加入のお知らせ。髪質改善専門の認定スタイリストが仲間に加わりました！", date: "2026-06-15", status: "published" },
];

type Review = typeof MOCK_REVIEWS[0];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={12} className={s <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-600"} />
      ))}
    </div>
  );
}

function ReviewCard({ review, onGenerateReply }: { review: Review; onGenerateReply: (id: string) => void }) {
  const [generating, setGenerating] = useState(false);
  const [aiReply, setAiReply] = useState("");

  const handleGenerate = async () => {
    setGenerating(true);
    onGenerateReply(review.id);
    await new Promise((r) => setTimeout(r, 1500));
    setAiReply(
      `${review.author}様、この度はご来店いただきありがとうございます！${
        review.rating === 5
          ? "お褒めの言葉をいただき大変うれしく思います。"
          : "ご意見をありがとうございます。改善に努めてまいります。"
      } またのご来店を心よりお待ちしております。Mys スタッフ一同`
    );
    setGenerating(false);
  };

  return (
    <div className="dashboard-card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-white">{review.author}</p>
          <div className="flex items-center gap-2 mt-1">
            <StarRating rating={review.rating} />
            <span className="text-xs text-gray-500">{review.date}</span>
          </div>
        </div>
        {review.replied ? (
          <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
            <CheckCircle2 size={10} />返信済
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded">
            <Clock size={10} />未返信
          </span>
        )}
      </div>
      <p className="text-sm text-gray-300 leading-relaxed mb-3">{review.text}</p>
      {review.replied && review.reply && (
        <div className="bg-[#12121A] rounded-lg p-3 mb-3 border-l-2 border-gold">
          <p className="text-xs text-gold mb-1">返信済み</p>
          <p className="text-xs text-gray-400">{review.reply}</p>
        </div>
      )}
      {!review.replied && (
        <div>
          {aiReply ? (
            <div className="space-y-2">
              <div className="bg-[#12121A] rounded-lg p-3 border-l-2 border-gold">
                <p className="text-xs text-gold mb-1">AI 生成返信（確認してください）</p>
                <p className="text-xs text-gray-300">{aiReply}</p>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-1.5 bg-gold/10 border border-gold/30 text-gold text-xs rounded-lg hover:bg-gold/20">
                  承認して投稿
                </button>
                <button onClick={() => setAiReply("")} className="py-1.5 px-3 bg-[#12121A] text-gray-400 text-xs rounded-lg border border-[#2A2A3E]">
                  再生成
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 py-2 bg-[#12121A] border border-[#2A2A3E] hover:border-gold/40 text-sm text-gray-400 hover:text-white rounded-lg transition-all"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-gold" />}
              AI 返信を生成
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function MeoPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "reviews" | "posts">("overview");
  const [postContent, setPostContent] = useState("");
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    setPosting(true);
    await new Promise((r) => setTimeout(r, 2000));
    setPosting(false);
    setPostContent("");
    alert("Google Business Profileに投稿しました（デモ）");
  };

  const stats = [
    { label: "Google評価", value: "4.71★", sub: "117件の口コミ" },
    { label: "今月の検索表示", value: "2,847", sub: "+12% 先月比" },
    { label: "電話クリック", value: "43", sub: "今月" },
    { label: "マップ表示", value: "891", sub: "今月" },
  ];

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">MEO 管理</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">Google Business 自動運用</h1>
        <p className="text-sm text-gray-500 mt-1">口コミ返信・投稿管理・MEO改善を一元管理</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="dashboard-card text-center">
            <p className="text-xl font-semibold text-white">{s.value}</p>
            <p className="text-xs text-gold mt-0.5">{s.label}</p>
            <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["overview", "reviews", "posts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              activeTab === tab ? "bg-gold/20 text-gold border border-gold/30" : "bg-[#1E1E2E] text-gray-400 border border-[#2A2A3E] hover:border-gray-500"
            }`}
          >
            {tab === "overview" ? "概要" : tab === "reviews" ? `口コミ管理（${MOCK_REVIEWS.filter((r) => !r.replied).length}件未返信）` : "投稿管理"}
          </button>
        ))}
      </div>

      {activeTab === "reviews" && (
        <div className="space-y-4">
          {MOCK_REVIEWS.map((r) => (
            <ReviewCard key={r.id} review={r} onGenerateReply={() => {}} />
          ))}
        </div>
      )}

      {activeTab === "posts" && (
        <div className="space-y-6">
          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-3">新規投稿作成</p>
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Google Business Profileに投稿する内容を入力..."
              rows={5}
              className="w-full bg-[#12121A] border border-[#2A2A3E] rounded-lg p-3 text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-gold/50 mb-3"
            />
            <div className="flex gap-3">
              <button
                onClick={handlePost}
                disabled={posting || !postContent.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-gold rounded-lg text-white text-sm hover:bg-gold-dark disabled:opacity-50"
              >
                {posting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Google Business に投稿
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-[#1E1E2E] border border-[#2A2A3E] rounded-lg text-gray-400 text-sm">
                <Sparkles size={14} className="text-gold" />
                AI で作成
              </button>
            </div>
          </div>
          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-3">投稿履歴</p>
            <div className="space-y-3">
              {MOCK_POSTS.map((p) => (
                <div key={p.id} className="p-3 bg-[#12121A] rounded-lg flex items-start justify-between gap-3">
                  <p className="text-sm text-gray-300 flex-1">{p.content}</p>
                  <div className="shrink-0 text-right">
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">公開済</span>
                    <p className="text-xs text-gray-600 mt-1">{p.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "overview" && (
        <div className="dashboard-card">
          <p className="text-sm font-medium text-white mb-4">MEO 改善チェックリスト</p>
          <div className="space-y-3">
            {[
              { done: true, task: "Google Business プロフィール完成度 100%" },
              { done: true, task: "週3回以上の投稿頻度を維持" },
              { done: false, task: "写真を30枚以上登録（現在22枚）" },
              { done: false, task: "口コミ返信率 100%（現在66%）" },
              { done: true, task: "サービス・メニュー情報の更新" },
              { done: false, task: "Q&A セクションの充実（0件）" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 size={16} className={item.done ? "text-emerald-400" : "text-gray-600"} />
                <p className={`text-sm ${item.done ? "text-gray-300" : "text-gray-500"}`}>{item.task}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
