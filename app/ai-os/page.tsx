import Link from "next/link";
import { Zap, CheckCircle2, TrendingUp, Users, Star, Bot, DollarSign, Building2 } from "lucide-react";

const FEATURES = [
  { icon: TrendingUp, title: "MEO Dominator", desc: "Googleマップで1位を自動維持。競合との差を毎日分析して実行プランを自動生成。" },
  { icon: Star, title: "レビュー加速", desc: "QRコードで口コミ誘導。AIが24時間以内に最適な返信文を自動生成。" },
  { icon: Users, title: "リテンション AI", desc: "来店が途絶えたお客様を予測。パーソナライズされたLINEで自動再来店促進。" },
  { icon: Bot, title: "24h セールス AI", desc: "Instagram DM・LINE・Webの問い合わせに深夜でも即返信。予約転換率68%。" },
  { icon: DollarSign, title: "価格最適化", desc: "空き時間の充填率をAIが分析。タイムセールとダイナミックプライシングを自動提案。" },
  { icon: Zap, title: "スタイリスト脳", desc: "音声メモを話すだけでInstagram・TikTok・ブログ記事を自動生成。" },
];

const PLANS = [
  {
    name: "Starter",
    price: "9,800",
    desc: "小規模サロン向け",
    features: ["コンテンツ自動生成（月10件）", "MEO管理", "月次レポート", "メールサポート"],
    cta: "14日間無料体験",
    highlight: false,
  },
  {
    name: "Standard",
    price: "29,800",
    desc: "成長中のサロン向け",
    features: ["コンテンツ自動生成（無制限）", "MEO管理 + 競合分析", "SEO記事（月4件）", "画像スタジオ", "顧客分析・リテンション AI", "チャットサポート"],
    cta: "14日間無料体験",
    highlight: true,
  },
  {
    name: "Pro",
    price: "49,800",
    desc: "売上を本気で伸ばしたいサロン",
    features: ["全機能解放", "24h AIセールスクローザー", "競合顧客奪取マシン", "価格最適化エンジン", "スタッフ研修 OS", "専任担当者サポート"],
    cta: "まず相談する",
    highlight: false,
  },
];

const RESULTS = [
  { metric: "新規予約数", value: "+34%", period: "導入3ヶ月" },
  { metric: "Googleレビュー数", value: "+89件", period: "導入6ヶ月" },
  { metric: "リピート率", value: "+18pt", period: "導入4ヶ月" },
  { metric: "SNS投稿工数", value: "▲90%削減", period: "導入初月から" },
];

export default function AiOsPage() {
  return (
    <div className="min-h-screen bg-[#0A0A14] text-white" style={{ fontFamily: "var(--font-noto-sans), sans-serif" }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0A0A14]/90 backdrop-blur border-b border-[#1E1E2E]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gold rounded-sm flex items-center justify-center">
            <Zap size={13} className="text-white" />
          </div>
          <span className="text-white font-display tracking-widest text-sm">M Y S</span>
          <span className="text-[10px] text-gold tracking-widest uppercase ml-1">AI Salon OS</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-gray-400 hover:text-white">サロンサイト</Link>
          <Link href="/dashboard" className="text-xs px-4 py-2 bg-gold/10 border border-gold/30 text-gold rounded-lg hover:bg-gold/20">
            デモを見る
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gold/10 border border-gold/20 rounded-full mb-8">
          <Zap size={11} className="text-gold" />
          <span className="text-xs text-gold tracking-wider">美容室専用 AI 自動化 OS</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light leading-tight mb-6" style={{ fontFamily: "var(--font-noto-serif), serif" }}>
          美容室の<span className="text-gold">集客・予約・SNS</span>を<br />AIが全自動で回す
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
          Mys（ミース）立川が自社開発・自社実証した美容室特化AIシステム。<br />
          月9,800円から導入でき、オーナーは経営判断だけに集中できる。
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/dashboard" className="px-8 py-4 bg-gold text-white rounded-lg text-sm font-medium hover:bg-gold-dark transition-colors">
            無料でデモを体験する →
          </Link>
          <a href="mailto:info@mys-salon.com" className="px-8 py-4 bg-[#1E1E2E] border border-[#2A2A3E] text-gray-300 rounded-lg text-sm hover:border-gold/30 transition-colors">
            資料請求・お問い合わせ
          </a>
        </div>
        <p className="text-xs text-gray-600 mt-4">クレジットカード不要 · 14日間無料 · いつでも解約可能</p>
      </section>

      {/* Results */}
      <section className="py-16 bg-[#0F0F1A] border-y border-[#1E1E2E]">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-xs text-gold tracking-widest uppercase mb-10">Mys での実証結果</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {RESULTS.map((r) => (
              <div key={r.metric} className="text-center">
                <p className="text-3xl font-bold text-gold mb-1">{r.value}</p>
                <p className="text-sm text-white mb-1">{r.metric}</p>
                <p className="text-xs text-gray-600">{r.period}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <p className="text-center text-xs text-gold tracking-widest uppercase mb-4">FEATURES</p>
        <h2 className="text-center text-3xl font-light mb-16" style={{ fontFamily: "var(--font-noto-serif), serif" }}>
          10の AI モジュールが<br />サロン運営を完全自動化
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-6 bg-[#0F0F1A] border border-[#1E1E2E] rounded-xl hover:border-gold/20 transition-colors">
              <f.icon size={20} className="text-gold mb-3" />
              <h3 className="text-white font-medium mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6 bg-[#0F0F1A] border-y border-[#1E1E2E]">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs text-gold tracking-widest uppercase mb-4">PRICING</p>
          <h2 className="text-center text-3xl font-light mb-4" style={{ fontFamily: "var(--font-noto-serif), serif" }}>料金プラン</h2>
          <p className="text-center text-gray-500 text-sm mb-16">すべてのプランに14日間の無料トライアル付き</p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div key={plan.name} className={`p-6 rounded-xl border ${plan.highlight ? "border-gold bg-gold/5" : "border-[#2A2A3E] bg-[#12121A]"}`}>
                {plan.highlight && (
                  <div className="text-[10px] text-gold tracking-widest uppercase mb-3 border border-gold/30 rounded px-2 py-0.5 inline-block">人気プラン</div>
                )}
                <h3 className="text-xl font-medium text-white mb-1">{plan.name}</h3>
                <p className="text-xs text-gray-500 mb-4">{plan.desc}</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">¥{plan.price}</span>
                  <span className="text-gray-500 text-sm">/月</span>
                </div>
                <ul className="space-y-2 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle2 size={14} className="text-gold shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="mailto:info@mys-salon.com"
                  className={`block text-center py-3 rounded-lg text-sm font-medium transition-colors ${plan.highlight ? "bg-gold text-white hover:bg-gold-dark" : "bg-[#1E1E2E] border border-[#2A2A3E] text-gray-300 hover:border-gold/30"}`}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <Building2 size={32} className="text-gold mx-auto mb-6" />
          <h2 className="text-3xl font-light mb-4" style={{ fontFamily: "var(--font-noto-serif), serif" }}>
            まずはデモを体験してください
          </h2>
          <p className="text-gray-500 mb-8">
            実際のダッシュボードをデモデータで自由に操作できます。<br />登録不要・クレカ不要。
          </p>
          <Link href="/dashboard" className="inline-block px-10 py-4 bg-gold text-white rounded-lg text-sm font-medium hover:bg-gold-dark transition-colors">
            デモダッシュボードを開く →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1E1E2E] py-8 px-6 text-center">
        <p className="text-xs text-gray-600">© 2024 Mys AI Salon OS. Powered by Mys（ミース）立川.</p>
        <div className="flex justify-center gap-6 mt-3">
          <Link href="/" className="text-xs text-gray-600 hover:text-gold">サロンサイト</Link>
          <Link href="/dashboard" className="text-xs text-gray-600 hover:text-gold">ダッシュボード</Link>
        </div>
      </footer>
    </div>
  );
}
