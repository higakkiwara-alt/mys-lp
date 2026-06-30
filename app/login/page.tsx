"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Lock, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 400));
    const correct = password === (process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD ?? "mys2024");
    if (correct) {
      sessionStorage.setItem("mys-auth", "1");
      router.push("/dashboard");
    } else {
      setError("パスワードが正しくありません");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A14] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gold rounded-xl mb-4">
            <Zap size={22} className="text-white" />
          </div>
          <p className="text-white font-display tracking-widest text-xl mb-1">M Y S</p>
          <p className="text-[10px] text-gold tracking-widest uppercase">AI Salon OS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              className="w-full bg-[#1E1E2E] border border-[#2A2A3E] rounded-xl pl-10 pr-10 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold/50 transition-colors"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3.5 bg-gold text-white rounded-xl text-sm font-medium hover:bg-[#A0813E] transition-colors disabled:opacity-50"
          >
            {loading ? "確認中..." : "ダッシュボードへ"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-700 mt-8">
          デモパスワード: <span className="text-gray-500">mys2024</span>
        </p>
      </div>
    </div>
  );
}
