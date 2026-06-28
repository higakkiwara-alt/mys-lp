"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Step = "password" | "mfa";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const safePath = redirect.startsWith("/") ? redirect : "/dashboard";

  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handlePassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.mfaRequired) {
        setStep("mfa");
        setPassword("");
      } else if (res.ok) {
        router.push(data.redirect ?? safePath);
      } else {
        setError(data.error ?? "ログインに失敗しました");
      }
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleMfa(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/mfa-verify?redirect=${encodeURIComponent(safePath)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.replace(/\s/g, "") }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push(data.redirect ?? safePath);
      } else {
        setError(data.error ?? "認証コードが正しくありません");
        setCode("");
      }
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#12121A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-light text-white tracking-widest mb-1">Mys</h1>
          <p className="text-sm text-gray-500">AI Salon OS</p>
        </div>

        {step === "password" ? (
          <form onSubmit={handlePassword} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-xs text-gray-400 mb-1.5 tracking-wide">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-[#1A1A2E] border border-gray-700 text-white rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#B8975A] transition-colors"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#B8975A] hover:bg-[#A0823E] disabled:opacity-50 text-white rounded py-2.5 text-sm font-medium transition-colors"
            >
              {loading ? "認証中..." : "ログイン"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMfa} className="space-y-4">
            <div className="text-center text-gray-400 text-sm mb-2">
              認証アプリの6桁のコードを入力してください
            </div>
            <div>
              <label htmlFor="code" className="block text-xs text-gray-400 mb-1.5 tracking-wide">
                認証コード
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                autoComplete="one-time-code"
                className="w-full bg-[#1A1A2E] border border-gray-700 text-white rounded px-3 py-2.5 text-sm text-center tracking-[0.5em] focus:outline-none focus:border-[#B8975A] transition-colors"
                placeholder="000000"
              />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-[#B8975A] hover:bg-[#A0823E] disabled:opacity-50 text-white rounded py-2.5 text-sm font-medium transition-colors"
            >
              {loading ? "認証中..." : "確認"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("password"); setError(""); setCode(""); }}
              className="w-full text-gray-500 text-xs hover:text-gray-300 transition-colors"
            >
              パスワード入力に戻る
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
