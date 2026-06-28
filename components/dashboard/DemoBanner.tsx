"use client";
import { useState } from "react";
import { Zap, X } from "lucide-react";
import Link from "next/link";

export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="bg-gold/10 border-b border-gold/20 px-4 py-2 flex items-center gap-3">
      <Zap size={12} className="text-gold shrink-0" />
      <p className="text-xs text-gold flex-1">
        <span className="font-medium">デモモード稼働中</span>
        <span className="text-gold/70 ml-2">— APIキーを設定すると全機能が本番稼働します。</span>
        <Link href="/dashboard/settings" className="underline ml-1 hover:text-gold-light">設定はこちら →</Link>
      </p>
      <button onClick={() => setDismissed(true)} className="text-gold/50 hover:text-gold shrink-0">
        <X size={12} />
      </button>
    </div>
  );
}
