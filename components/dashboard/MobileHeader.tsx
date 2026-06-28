"use client";
import { Menu, Zap } from "lucide-react";

export default function MobileHeader({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#0F0F1A] border-b border-[#1E1E2E] sticky top-0 z-30">
      <button onClick={onOpen} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
        <Menu size={18} />
      </button>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-gold rounded-sm flex items-center justify-center">
          <Zap size={11} className="text-white" />
        </div>
        <span className="text-white text-sm tracking-widest font-display">M Y S</span>
        <span className="text-[9px] text-gold tracking-widest uppercase">AI OS</span>
      </div>
    </div>
  );
}
