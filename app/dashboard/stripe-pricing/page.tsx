"use client";
import { useState } from "react";
import { CreditCard, Check, Star, Zap, Shield, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  price: number;
  annualPrice: number;
  description: string;
  color: string;
  highlight: boolean;
  features: string[];
  limits: string[];
};

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "スターター",
    price: 9800,
    annualPrice: 7840,
    description: "個人サロン・副業スタイリスト向け",
    color: "border-[#2A2A3E]",
    highlight: false,
    features: [
      "CEOダイジェスト（週次）",
      "MEOランクトラッカー（1店舗）",
      "SNS投稿スケジュール管理",
      "顧客管理（最大100名）",
      "AI返信テンプレート（月10件）",
    ],
    limits: ["API連携なし", "スタッフ1名"],
  },
  {
    id: "pro",
    name: "プロ",
    price: 29800,
    annualPrice: 23840,
    description: "小規模サロン（2〜5名）向け",
    color: "border-gold/40",
    highlight: true,
    features: [
      "CEOダイジェスト（毎日自動生成）",
      "MEOランクトラッカー（3店舗）",
      "コンテンツカレンダー AI提案",
      "顧客CRM（無制限）",
      "AI返信生成（無制限）",
      "リテンション自動配信（LINE）",
      "ハッシュタグ分析",
      "競合モニタリング（3社）",
    ],
    limits: ["スタッフ5名まで"],
  },
  {
    id: "enterprise",
    name: "エンタープライズ",
    price: 79800,
    annualPrice: 63840,
    description: "多店舗・フランチャイズ向け",
    color: "border-purple-500/40",
    highlight: false,
    features: [
      "プロの全機能",
      "MEOランクトラッカー（無制限店舗）",
      "カスタムAIモデル学習",
      "多店舗統合ダッシュボード",
      "専任サポートマネージャー",
      "API直接アクセス",
      "SLA 99.9%保証",
      "オンボーディング支援（4時間）",
    ],
    limits: ["スタッフ無制限"],
  },
];

const FAQ = [
  { q: "無料トライアルはありますか？", a: "はい、全プランで14日間の無料トライアルを提供しています。クレジットカード不要でお試しいただけます。" },
  { q: "途中でプランを変更できますか？", a: "いつでもアップグレード・ダウングレードが可能です。日割り計算で差額を精算します。" },
  { q: "解約はどうすれば？", a: "マイページから即時解約できます。解約後も月末まではサービスをご利用いただけます。" },
  { q: "データのエクスポートは？", a: "全プランでCSV・JSONエクスポートに対応しています。解約前にいつでもダウンロード可能です。" },
];

export default function StripePricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <CreditCard size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">Pricing</p>
        </div>
        <h1 className="text-2xl font-semibold text-white mb-2">料金プラン</h1>
        <p className="text-sm text-gray-500">全プラン14日間無料トライアル付き · いつでもキャンセル可</p>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <span className={`text-sm ${!annual ? "text-white" : "text-gray-500"}`}>月払い</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? "bg-gold" : "bg-[#2A2A3E]"}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${annual ? "left-7" : "left-1"}`} />
          </button>
          <span className={`text-sm ${annual ? "text-white" : "text-gray-500"}`}>
            年払い <span className="text-emerald-400 text-xs ml-1">20%OFF</span>
          </span>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {PLANS.map((plan) => {
          const price = annual ? plan.annualPrice : plan.price;
          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 transition-all ${plan.highlight ? "bg-gold/5 border-gold/40 shadow-[0_0_30px_rgba(184,151,90,0.1)]" : "bg-[#1E1E2E] " + plan.color}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 text-[10px] px-3 py-1 bg-gold text-black font-bold rounded-full">
                    <Star size={9} fill="black" />人気No.1
                  </span>
                </div>
              )}

              <div className="mb-4">
                <p className="text-white font-semibold text-lg">{plan.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-white">¥{price.toLocaleString()}</span>
                  <span className="text-sm text-gray-500 mb-1">/月</span>
                </div>
                {annual && (
                  <p className="text-xs text-emerald-400 mt-1">年間 ¥{(price * 12).toLocaleString()} (¥{((plan.price - price) * 12).toLocaleString()}お得)</p>
                )}
              </div>

              <button
                onClick={() => setSelected(plan.id)}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all mb-6 flex items-center justify-center gap-2 ${
                  plan.highlight
                    ? "bg-gold text-black hover:bg-gold/90"
                    : "bg-[#12121A] border border-[#2A2A3E] text-white hover:border-gold/30"
                } ${selected === plan.id ? "ring-2 ring-gold" : ""}`}
              >
                {selected === plan.id ? <Check size={14} /> : <ArrowRight size={14} />}
                {selected === plan.id ? "選択中" : "無料で試す"}
              </button>

              <div className="space-y-2">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <Check size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">{f}</span>
                  </div>
                ))}
                {plan.limits.map((l) => (
                  <div key={l} className="flex items-start gap-2 opacity-60">
                    <span className="text-xs text-gray-600 ml-4">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust badges */}
      <div className="grid grid-cols-3 gap-4 mb-12">
        {[
          { icon: Shield, title: "SSL暗号化", desc: "決済はStripeで安全に処理" },
          { icon: Zap, title: "即時開始", desc: "申込み後すぐに利用開始" },
          { icon: Star, title: "解約自由", desc: "縛りなし・いつでも解約OK" },
        ].map((b) => (
          <div key={b.title} className="dashboard-card flex items-center gap-3 text-center flex-col py-6">
            <b.icon size={20} className="text-gold" />
            <div>
              <p className="text-sm font-medium text-white">{b.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div>
        <p className="text-sm font-medium text-white mb-4">よくある質問</p>
        <div className="space-y-2">
          {FAQ.map((faq, i) => (
            <div key={i} className="dashboard-card">
              <button
                className="w-full flex items-center justify-between text-left"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className="text-sm text-white">{faq.q}</span>
                {openFaq === i ? <ChevronUp size={14} className="text-gray-500 shrink-0" /> : <ChevronDown size={14} className="text-gray-500 shrink-0" />}
              </button>
              {openFaq === i && (
                <p className="text-sm text-gray-400 mt-3 pt-3 border-t border-[#2A2A3E] leading-relaxed">{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      {selected && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-[#1E1E2E] border border-gold/40 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
            <div>
              <p className="text-sm font-medium text-white">{PLANS.find((p) => p.id === selected)?.name}プランを選択中</p>
              <p className="text-xs text-gray-500">14日間無料トライアル開始</p>
            </div>
            <button className="px-4 py-2 bg-gold text-black text-sm font-bold rounded-xl hover:bg-gold/90 flex items-center gap-2">
              <CreditCard size={14} />申し込む
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
