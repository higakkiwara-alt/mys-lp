"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Share2, MapPin, FileText, TrendingUp,
  Image, Brain, Settings, ChevronRight, Zap
} from "lucide-react";

const nav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "CEO Digest", desc: "毎朝のレポート" },
  { href: "/dashboard/content-hub", icon: Share2, label: "Content Hub", desc: "全媒体へ自動展開" },
  { href: "/dashboard/meo", icon: MapPin, label: "MEO 管理", desc: "Google Business" },
  { href: "/dashboard/seo", icon: FileText, label: "SEO Factory", desc: "ブログ・記事生成" },
  { href: "/dashboard/competitor", icon: TrendingUp, label: "競合分析", desc: "毎日自動取得" },
  { href: "/dashboard/image-studio", icon: Image, label: "画像スタジオ", desc: "Before/After自動化" },
  { href: "/dashboard/brain", icon: Brain, label: "Company Brain", desc: "会社の知識DB" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-[#0F0F1A] border-r border-[#1E1E2E] flex flex-col overflow-hidden sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-[#1E1E2E]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gold rounded-sm flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-display text-lg tracking-widest">M Y S</p>
            <p className="text-[10px] text-gold tracking-widest uppercase">AI Salon OS</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto dashboard-scroll">
        <p className="px-6 py-2 text-[10px] text-gray-600 tracking-widest uppercase">Management</p>
        {nav.map(({ href, icon: Icon, label, desc }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-6 py-3 group transition-all duration-200 ${
                active
                  ? "bg-gold/10 border-r-2 border-gold"
                  : "hover:bg-white/5"
              }`}
            >
              <Icon
                size={18}
                className={active ? "text-gold" : "text-gray-500 group-hover:text-gray-300"}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${active ? "text-white" : "text-gray-400 group-hover:text-white"}`}>
                  {label}
                </p>
                <p className="text-[10px] text-gray-600 truncate">{desc}</p>
              </div>
              {active && <ChevronRight size={14} className="text-gold shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-[#1E1E2E]">
        <Link href="/dashboard/settings" className="flex items-center gap-3 px-2 py-2 rounded hover:bg-white/5 transition-colors">
          <Settings size={16} className="text-gray-500" />
          <span className="text-xs text-gray-500">設定</span>
        </Link>
        <Link href="/" className="flex items-center gap-3 px-2 py-2 rounded hover:bg-white/5 transition-colors mt-1">
          <span className="text-[10px] text-gray-600">← LP に戻る</span>
        </Link>
      </div>
    </aside>
  );
}
