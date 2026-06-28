"use client";
import { useState } from "react";
import { Image as ImageIcon, Upload, Sparkles, Download, Loader2, CheckCircle2 } from "lucide-react";

const TEMPLATES = [
  { id: "before-after", label: "Before / After", desc: "ビフォーアフター比較" },
  { id: "square", label: "正方形（Instagram）", desc: "1080×1080px" },
  { id: "story", label: "ストーリー縦型", desc: "1080×1920px" },
  { id: "google", label: "Google Business", desc: "1024×768px" },
  { id: "wide", label: "横長（ブログ）", desc: "1280×720px" },
];

const ACTIONS = [
  { id: "remove-bg", label: "背景除去", desc: "AIが背景を自動除去" },
  { id: "whiten-bg", label: "背景を白に統一", desc: "プロ仕上げの背景" },
  { id: "add-logo", label: "ロゴを追加", desc: "Mysロゴを透かしで追加" },
  { id: "add-text", label: "テキスト追加", desc: "サロン名・連絡先を追加" },
  { id: "resize", label: "自動リサイズ", desc: "全サイズを一括生成" },
];

export default function ImageStudioPage() {
  const [selectedTemplate, setSelectedTemplate] = useState("before-after");
  const [selectedActions, setSelectedActions] = useState(["remove-bg", "add-logo", "resize"]);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const handleProcess = async () => {
    setProcessing(true);
    setDone(false);
    await new Promise((r) => setTimeout(r, 3000));
    setProcessing(false);
    setDone(true);
  };

  const toggleAction = (id: string) => {
    setSelectedActions((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <ImageIcon size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">Image Studio</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">AI 画像スタジオ</h1>
        <p className="text-sm text-gray-500 mt-1">写真1枚を全媒体用に自動加工・Before/After生成</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload */}
        <div className="space-y-4">
          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-3">画像アップロード</p>
            <div className="border-2 border-dashed border-[#2A2A3E] hover:border-gold/40 rounded-xl p-12 text-center cursor-pointer transition-colors group">
              <Upload size={32} className="text-gray-600 group-hover:text-gold mx-auto mb-3 transition-colors" />
              <p className="text-sm text-gray-500">クリックまたはドラッグ＆ドロップ</p>
              <p className="text-xs text-gray-700 mt-1">JPG, PNG, WEBP 対応</p>
            </div>
          </div>

          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-3">処理オプション</p>
            <div className="space-y-2">
              {ACTIONS.map((action) => (
                <label key={action.id} className="flex items-start gap-3 cursor-pointer group p-2 rounded-lg hover:bg-[#12121A] transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedActions.includes(action.id)}
                    onChange={() => toggleAction(action.id)}
                    className="mt-0.5 accent-gold"
                  />
                  <div>
                    <p className="text-sm text-gray-300 group-hover:text-white transition-colors">{action.label}</p>
                    <p className="text-xs text-gray-600">{action.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Templates & Result */}
        <div className="space-y-4">
          <div className="dashboard-card">
            <p className="text-sm font-medium text-white mb-3">出力テンプレート</p>
            <div className="space-y-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                    selectedTemplate === t.id
                      ? "bg-gold/10 border-gold/40 text-white"
                      : "bg-[#12121A] border-[#2A2A3E] text-gray-400 hover:border-gray-500"
                  }`}
                >
                  <div className="text-left">
                    <p className="text-sm">{t.label}</p>
                    <p className="text-xs text-gray-600">{t.desc}</p>
                  </div>
                  {selectedTemplate === t.id && <CheckCircle2 size={16} className="text-gold" />}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleProcess}
            disabled={processing}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gold rounded-lg text-white font-medium hover:bg-gold-dark disabled:opacity-50 transition-colors"
          >
            {processing ? (
              <><Loader2 size={16} className="animate-spin" />AI 処理中...</>
            ) : (
              <><Sparkles size={16} />AI で画像を処理する</>
            )}
          </button>

          {done && (
            <div className="dashboard-card">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <p className="text-sm font-medium text-white">処理完了！</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {["Instagram (1:1)", "Stories (9:16)", "Google Business", "ブログ横長"].map((size) => (
                  <div key={size} className="bg-[#12121A] rounded-lg p-3 text-center">
                    <div className="w-full h-20 bg-[#1E1E2E] rounded mb-2 flex items-center justify-center">
                      <ImageIcon size={24} className="text-gray-600" />
                    </div>
                    <p className="text-xs text-gray-400">{size}</p>
                    <button className="mt-2 flex items-center gap-1 text-xs text-gold hover:text-gold-light mx-auto">
                      <Download size={10} />ダウンロード
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-3 text-center">
                ※ 実際のAPIキー設定後、OpenAI / Remove.bg で処理されます
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
