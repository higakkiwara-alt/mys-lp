"use client";
import { useState } from "react";
import { FileText, TrendingUp, TrendingDown, Minus, Sparkles, Loader2, ExternalLink } from "lucide-react";

const KEYWORDS = [
  { keyword: "縮毛矯正 立川", rank: 3, prev: 4, volume: 1200, url: "https://mys-salon.com/縮毛矯正-立川" },
  { keyword: "髪質改善 立川", rank: 7, prev: 5, volume: 880, url: "https://mys-salon.com/髪質改善-立川" },
  { keyword: "美容室 立川 おすすめ", rank: 12, prev: 12, volume: 3400, url: null },
  { keyword: "縮毛矯正 立川 安い", rank: 5, prev: 6, volume: 590, url: "https://mys-salon.com/縮毛矯正-立川" },
  { keyword: "ショートヘア 縮毛矯正 立川", rank: 2, prev: 3, volume: 320, url: "https://mys-salon.com/ショート-縮毛矯正" },
  { keyword: "髪質改善トリートメント 立川", rank: 4, prev: 4, volume: 450, url: "https://mys-salon.com/トリートメント" },
];

type Keyword = typeof KEYWORDS[0];

function RankBadge({ rank, prev }: { rank: number; prev: number }) {
  const diff = prev - rank;
  if (diff > 0) return (
    <div className="flex items-center gap-1 text-emerald-400">
      <TrendingUp size={12} />
      <span className="text-xs">{rank}位 (+{diff})</span>
    </div>
  );
  if (diff < 0) return (
    <div className="flex items-center gap-1 text-red-400">
      <TrendingDown size={12} />
      <span className="text-xs">{rank}位 ({diff})</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1 text-gray-400">
      <Minus size={12} />
      <span className="text-xs">{rank}位 (→)</span>
    </div>
  );
}

export default function SeoPage() {
  const [keyword, setKeyword] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ title: string; outline: string[] } | null>(null);
  const [activeTab, setActiveTab] = useState<"keywords" | "blog">("keywords");

  const handleGenerate = async () => {
    if (!keyword.trim()) return;
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 2000));
    setGenerated({
      title: `【2026年最新】${keyword}で選ぶ美容室｜Mysが徹底解説`,
      outline: [
        "1. はじめに〜${keyword}を検討している方へ",
        "2. ${keyword}の基礎知識",
        "3. Mysの${keyword}の特徴・強み",
        "4. よくある質問（FAQ）",
        "5. 料金・メニュー案内",
        "6. まとめ・ご予約はこちら",
      ].map((s) => s.replace(/\$\{keyword\}/g, keyword)),
    });
    setGenerating(false);
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">SEO Factory</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">SEO 自動化</h1>
        <p className="text-sm text-gray-500 mt-1">検索順位監視・AIブログ生成・リライト提案</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["keywords", "blog"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              activeTab === tab ? "bg-gold/20 text-gold border border-gold/30" : "bg-[#1E1E2E] text-gray-400 border border-[#2A2A3E]"
            }`}
          >
            {tab === "keywords" ? "キーワード順位管理" : "AI ブログ生成"}
          </button>
        ))}
      </div>

      {activeTab === "keywords" && (
        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-white">監視キーワード一覧</p>
            <span className="text-xs text-gray-500">最終更新: 今日 6:00</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-[#2A2A3E]">
                  <th className="text-left pb-3 font-medium">キーワード</th>
                  <th className="text-left pb-3 font-medium">順位</th>
                  <th className="text-left pb-3 font-medium">月間検索数</th>
                  <th className="text-left pb-3 font-medium">対象URL</th>
                  <th className="text-left pb-3 font-medium">アクション</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E2E]">
                {KEYWORDS.map((kw) => (
                  <tr key={kw.keyword} className="group hover:bg-[#1A1A2A] transition-colors">
                    <td className="py-3 pr-4">
                      <p className="text-sm text-white">{kw.keyword}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <RankBadge rank={kw.rank} prev={kw.prev} />
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm text-gray-300">{kw.volume.toLocaleString()}</span>
                    </td>
                    <td className="py-3 pr-4">
                      {kw.url ? (
                        <a href={kw.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300">
                          記事あり <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-xs text-red-400">記事なし</span>
                      )}
                    </td>
                    <td className="py-3">
                      <button className="text-xs text-gold hover:text-gold-light flex items-center gap-1">
                        <Sparkles size={10} />
                        {kw.url ? "リライト" : "記事作成"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs text-yellow-300">
              💡 「髪質改善 立川」が5位→7位に低下。既存記事のリライトと内部リンク強化を推奨します。
            </p>
          </div>
        </div>
      )}

      {activeTab === "blog" && (
        <div className="space-y-4">
          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-3">AIブログ記事生成</p>
            <div className="flex gap-3 mb-4">
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="ターゲットキーワードを入力（例: 縮毛矯正 立川）"
                className="flex-1 bg-[#12121A] border border-[#2A2A3E] rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gold/50"
              />
              <button
                onClick={handleGenerate}
                disabled={generating || !keyword.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-gold rounded-lg text-white text-sm hover:bg-gold-dark disabled:opacity-50"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                生成
              </button>
            </div>
          </div>

          {generated && (
            <div className="dashboard-card">
              <p className="text-sm text-gold mb-2">生成されたブログ構成</p>
              <p className="text-lg font-medium text-white mb-4">{generated.title}</p>
              <div className="space-y-2">
                {generated.outline.map((section, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-[#12121A] rounded text-sm text-gray-300">
                    <span className="text-gold text-xs w-4">{i + 1}.</span>
                    {section}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-4">
                <button className="px-4 py-2 bg-gold/10 border border-gold/30 rounded-lg text-gold text-sm hover:bg-gold/20">
                  本文を生成する
                </button>
                <button className="px-4 py-2 bg-[#1E1E2E] border border-[#2A2A3E] rounded-lg text-gray-400 text-sm">
                  WordPressに下書き保存
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
