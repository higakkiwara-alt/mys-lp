import Link from "next/link";
import { Star, MessageCircle, Instagram, ExternalLink } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mys（ミース）| 口コミ・ご予約",
  description: "Mys（ミース）立川のGoogle口コミを書いていただけると大変励みになります。",
};

const GOOGLE_REVIEW_URL = "https://g.page/r/mys-tachikawa/review";
const LINE_ADD_URL = "https://line.me/R/ti/p/@906kdphu";
const INSTAGRAM_URL = "https://www.instagram.com/mys_tachikawa/";
const HOTPEPPER_URL = "https://beauty.hotpepper.jp/slnH000721782/";

export default function ReviewPage() {
  return (
    <div className="min-h-screen bg-[#0A0A14] text-white flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="mb-10 text-center">
        <p className="font-display text-3xl tracking-[0.4em] text-white mb-1">M Y S</p>
        <p className="text-xs text-[#B8975A] tracking-widest uppercase">立川・髪質改善専門サロン</p>
      </div>

      <h1 className="text-xl font-light text-center mb-2 leading-relaxed">
        本日はご来店いただき<br />ありがとうございました
      </h1>
      <p className="text-sm text-gray-500 text-center mb-10 max-w-xs leading-relaxed">
        ご感想をGoogleに書いていただけると<br />とても励みになります
      </p>

      {/* Google Review — main CTA */}
      <a
        href={GOOGLE_REVIEW_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full max-w-xs mb-4 flex items-center justify-between gap-3 px-6 py-4 bg-[#B8975A] text-white rounded-xl font-medium shadow-lg hover:bg-[#A0813E] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Star size={20} fill="white" />
          <div>
            <p className="font-semibold text-base">Googleで口コミを書く</p>
            <p className="text-xs opacity-80">1分で完了 · とても助かります</p>
          </div>
        </div>
        <ExternalLink size={16} className="opacity-70 shrink-0" />
      </a>

      {/* Secondary actions */}
      <div className="w-full max-w-xs space-y-3 mb-10">
        <a
          href={LINE_ADD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 px-5 py-3.5 bg-[#06C755]/10 border border-[#06C755]/30 text-[#06C755] rounded-xl hover:bg-[#06C755]/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <MessageCircle size={18} />
            <div>
              <p className="font-medium text-sm">LINE 友だち追加</p>
              <p className="text-xs opacity-70">お得な情報・予約リマインド</p>
            </div>
          </div>
          <ExternalLink size={14} className="opacity-50 shrink-0" />
        </a>

        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 px-5 py-3.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Instagram size={18} />
            <div>
              <p className="font-medium text-sm">Instagram をフォロー</p>
              <p className="text-xs opacity-60">スタイル事例・最新情報</p>
            </div>
          </div>
          <ExternalLink size={14} className="opacity-50 shrink-0" />
        </a>

        <a
          href={HOTPEPPER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 px-5 py-3.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Star size={18} />
            <div>
              <p className="font-medium text-sm">次回予約を取る</p>
              <p className="text-xs opacity-60">Hotpepper Beauty で簡単予約</p>
            </div>
          </div>
          <ExternalLink size={14} className="opacity-50 shrink-0" />
        </a>
      </div>

      <div className="text-center">
        <p className="text-xs text-gray-700 mb-1">次回もお会いできることを楽しみにしております</p>
        <Link href="/" className="text-xs text-[#B8975A]/60 hover:text-[#B8975A] transition-colors">
          Mys（ミース）立川 公式サイト
        </Link>
      </div>
    </div>
  );
}
