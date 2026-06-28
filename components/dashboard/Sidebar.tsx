"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Share2, MapPin, FileText, TrendingUp,
  Image, Brain, Settings, ChevronRight, Zap, Users,
  Heart, Star, DollarSign, Bot, Target, Building2, BookOpen, Mic
} from "lucide-react";

const OPERATIONS_NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "CEO Digest", desc: "毎朝のレポート" },
  { href: "/dashboard/content-hub", icon: Share2, label: "Content Hub", desc: "全媒体へ自動展開" },
  { href: "/dashboard/meo", icon: MapPin, label: "MEO 管理", desc: "Google Business" },
  { href: "/dashboard/meo/dominator", icon: Target, label: "MEO Dominator", desc: "ランク征服・自動実行" },
  { href: "/dashboard/seo", icon: FileText, label: "SEO Factory", desc: "ブログ・記事生成" },
  { href: "/dashboard/competitor", icon: TrendingUp, label: "競合分析", desc: "毎日自動取得" },
  { href: "/dashboard/competitor/steal", icon: Target, label: "競合奪取マシン", desc: "低評価から広告生成" },
  { href: "/dashboard/image-studio", icon: Image, label: "画像スタジオ", desc: "Before/After自動化" },
  { href: "/dashboard/brain", icon: Brain, label: "Company Brain", desc: "会社の知識DB" },
];

const GROWTH_NAV = [
  { href: "/dashboard/stylist-brain", icon: Mic, label: "スタイリスト脳", desc: "音声→SNSコンテンツ" },
  { href: "/dashboard/retention", icon: Heart, label: "リテンション AI", desc: "離脱予測・再来店促進" },
  { href: "/dashboard/reviews", icon: Star, label: "レビュー加速", desc: "QRコード・AI返信" },
  { href: "/dashboard/pricing", icon: DollarSign, label: "価格最適化", desc: "充填率×AI価格提案" },
  { href: "/dashboard/sales-closer", icon: Bot, label: "24h セールスAI", desc: "DM即時返信・予約転換" },
  { href: "/dashboard/recruit", icon: Users, label: "採用 AI", desc: "求人・選考自動化" },
  { href: "/dashboard/training", icon: BookOpen, label: "研修 OS", desc: "AI Q&A・教材生成" },
  { href: "/dashboard/saas", icon: Building2, label: "SaaS Console", desc: "クライアント管理" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const NavLink = ({ href, icon: Icon, label, desc }: { href: string; icon: React.ElementType; label: string; desc: string }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-2.5 px-5 py-2 group transition-all duration-150 ${
          active ? "bg-gold/10 border-r-2 border-gold" : "hover:bg-white/4"
        }`}
      >
        <Icon
          size={14}
          className={active ? "text-gold" : "text-gray-500 group-hover:text-gray-300"}
        />
        <div className="flex-1 min-w-0">
          <p className={`text-[12px] font-medium truncate leading-tight ${
            active ? "text-white" : "text-gray-400 group-hover:text-white"
          }`}>
            {label}
          </p>
          <p className="text-[9px] text-gray-600 truncate">{desc}</p>
        </div>
        {active && <ChevronRight size={11} className="text-gold shrink-0" />}
      </Link>
    );
  };

  return (
    <aside className="w-60 h-screen bg-[#0F0F1A] border-r border-[#1E1E2E] flex flex-col overflow-hidden sticky top-0 shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-[#1E1E2E]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gold rounded-sm flex items-center justify-center">
            <Zap size={15} className="text-white" />
          </div>
          <div>
            <p className="text-white font-display text-base tracking-widest">M Y S</p>
            <p className="text-[9px] text-gold tracking-widest uppercase">AI Salon OS</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto dashboard-scroll">
        <p className="px-5 py-1.5 text-[9px] text-gray-600 tracking-widest uppercase font-medium">Operations</p>
        {OPERATIONS_NAV.map((item) => <NavLink key={item.href} {...item} />)}

        <p className="px-5 py-1.5 mt-2 text-[9px] text-gray-600 tracking-widest uppercase font-medium border-t border-[#1E1E2E] pt-3">Growth</p>
        {GROWTH_NAV.map((item) => <NavLink key={item.href} {...item} />)}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-[#1E1E2E] space-y-1">
        <Link
          href="/dashboard/settings"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors ${
            pathname === "/dashboard/settings" ? "bg-gold/10 text-gold" : "text-gray-500"
          }`}
        >
          <Settings size={14} />
          <span className="text-xs">設定・API キー</span>
        </Link>
        <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
          <span className="text-[10px] text-gray-600">← LP に戻る</span>
        </Link>
      </div>
    </aside>
  );
}
