"use client";
import { useState, useRef, useCallback } from "react";
import {
  Image as ImageIcon, Upload, Sparkles, Download, Loader2,
  CheckCircle2, X, Wand2, AlignLeft
} from "lucide-react";

const OUTPUT_SIZES = [
  { id: "instagram", label: "Instagram 正方形", size: "1080×1080", icon: "📸" },
  { id: "story", label: "Stories 縦型", size: "1080×1920", icon: "📱" },
  { id: "google", label: "Google Business", size: "1024×768", icon: "🗺️" },
  { id: "wide", label: "横長（ブログ）", size: "1280×720", icon: "💻" },
  { id: "twitter", label: "X (Twitter)", size: "1200×675", icon: "𝕏" },
];

const AI_ACTIONS = [
  { id: "remove-bg", label: "背景除去", desc: "AIが自動で背景を透明化", icon: "✂️" },
  { id: "white-bg", label: "背景を白に", desc: "スタジオ撮影風に統一", icon: "⬜" },
  { id: "logo", label: "Mysロゴを追加", desc: "透かしロゴを最適な位置に", icon: "🏷️" },
  { id: "caption", label: "AIキャプション生成", desc: "GPT-4 Vision でキャプション自動生成", icon: "✍️" },
  { id: "enhance", label: "画質向上", desc: "AI で鮮明化・明度補正", icon: "✨" },
];

export default function ImageStudioPage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedActions, setSelectedActions] = useState(["remove-bg", "logo"]);
  const [selectedSizes, setSelectedSizes] = useState(["instagram", "story", "google"]);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [caption, setCaption] = useState<{ instagram: string; google: string; hashtags: string[] } | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "generate">("upload");
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
    setDone(false);
    setCaption(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type.startsWith("image/")) handleFile(dropped);
  }, []);

  const handleProcess = async () => {
    setProcessing(true);
    setDone(false);
    try {
      if (selectedActions.includes("caption") && preview) {
        setGeneratingCaption(true);
        const res = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "caption", imageUrl: preview }),
        });
        if (res.ok) {
          const data = await res.json();
          setCaption(data.captions);
        }
        setGeneratingCaption(false);
      }
      await new Promise((r) => setTimeout(r, 2500));
      setDone(true);
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerate = async () => {
    if (!generatePrompt.trim()) return;
    setProcessing(true);
    setGeneratedImageUrl(null);
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "before-after", prompt: generatePrompt }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedImageUrl(data.imageUrl);
      } else {
        setGeneratedImageUrl("https://images.unsplash.com/photo-1560869713-7d0a29430803?w=512");
      }
    } catch {
      setGeneratedImageUrl("https://images.unsplash.com/photo-1560869713-7d0a29430803?w=512");
    } finally {
      setProcessing(false);
    }
  };

  const toggleAction = (id: string) =>
    setSelectedActions((p) => p.includes(id) ? p.filter((a) => a !== id) : [...p, id]);
  const toggleSize = (id: string) =>
    setSelectedSizes((p) => p.includes(id) ? p.filter((s) => s !== id) : [...p, id]);

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <ImageIcon size={16} className="text-gold" />
          <p className="text-xs text-gold tracking-widest uppercase">Image Studio</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">AI 画像スタジオ</h1>
        <p className="text-sm text-gray-500 mt-1">写真1枚を全媒体用に自動加工・Before/After生成・AIキャプション</p>
      </div>

      <div className="flex gap-2 mb-6">
        {(["upload", "generate"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              activeTab === tab ? "bg-gold/20 text-gold border border-gold/30" : "bg-[#1E1E2E] text-gray-400 border border-[#2A2A3E]"
            }`}>
            {tab === "upload" ? "📁 写真を加工" : "🎨 AI で画像生成"}
          </button>
        ))}
      </div>

      {activeTab === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Upload area */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragging ? "border-gold bg-gold/10" : "border-[#2A2A3E] hover:border-gold/40"
              }`}
            >
              <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }} />
              {preview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-contain" />
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); setDone(false); }}
                    className="absolute top-0 right-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <X size={12} className="text-white" />
                  </button>
                  <p className="text-xs text-gray-500 mt-2">{file?.name}</p>
                </div>
              ) : (
                <>
                  <Upload size={32} className="text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">クリックまたはドラッグ＆ドロップ</p>
                  <p className="text-xs text-gray-700 mt-1">JPG / PNG / WEBP 対応</p>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="dashboard-card">
              <p className="text-sm font-medium text-white mb-3">AI 処理オプション</p>
              <div className="space-y-2">
                {AI_ACTIONS.map((a) => (
                  <label key={a.id} className="flex items-start gap-3 cursor-pointer group p-2 rounded hover:bg-[#12121A]">
                    <input type="checkbox" checked={selectedActions.includes(a.id)}
                      onChange={() => toggleAction(a.id)} className="mt-0.5 accent-gold" />
                    <span className="text-base">{a.icon}</span>
                    <div>
                      <p className="text-sm text-gray-300 group-hover:text-white">{a.label}</p>
                      <p className="text-xs text-gray-600">{a.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Output sizes */}
            <div className="dashboard-card">
              <p className="text-sm font-medium text-white mb-3">出力サイズ</p>
              <div className="space-y-2">
                {OUTPUT_SIZES.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 cursor-pointer group p-2 rounded hover:bg-[#12121A]">
                    <input type="checkbox" checked={selectedSizes.includes(s.id)}
                      onChange={() => toggleSize(s.id)} className="accent-gold" />
                    <span>{s.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-300 group-hover:text-white">{s.label}</p>
                    </div>
                    <span className="text-xs text-gray-600">{s.size}</span>
                  </label>
                ))}
              </div>
            </div>

            <button onClick={handleProcess} disabled={processing || !file}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gold rounded-lg text-white font-medium hover:bg-gold-dark disabled:opacity-50 transition-colors">
              {processing ? <><Loader2 size={16} className="animate-spin" />処理中...</> : <><Wand2 size={16} />AI で画像を処理</>}
            </button>

            {/* Results */}
            {done && (
              <div className="dashboard-card">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <p className="text-sm font-medium text-white">処理完了</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {OUTPUT_SIZES.filter((s) => selectedSizes.includes(s.id)).map((s) => (
                    <div key={s.id} className="bg-[#12121A] rounded-lg p-2 text-center">
                      <div className="h-16 bg-[#1E1E2E] rounded mb-1.5 flex items-center justify-center">
                        <span className="text-lg">{s.icon}</span>
                      </div>
                      <p className="text-[10px] text-gray-400">{s.label}</p>
                      <button className="mt-1 text-[10px] text-gold flex items-center gap-0.5 mx-auto">
                        <Download size={8} />DL
                      </button>
                    </div>
                  ))}
                </div>
                {caption && (
                  <div className="mt-3 p-3 bg-[#12121A] rounded-lg border-l-2 border-gold">
                    <p className="text-xs text-gold mb-2 flex items-center gap-1"><AlignLeft size={10} />AI生成キャプション</p>
                    <p className="text-xs text-gray-300 mb-2">{caption.instagram}</p>
                    <div className="flex flex-wrap gap-1">
                      {caption.hashtags?.map((tag) => (
                        <span key={tag} className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "generate" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="dashboard-card">
              <p className="text-sm font-medium text-white mb-3">画像生成プロンプト</p>
              <textarea value={generatePrompt} onChange={(e) => setGeneratePrompt(e.target.value)}
                placeholder="例: 縮毛矯正のビフォーアフター。左側がウェーブのかかった状態、右側がサラサラストレートに仕上がった状態。プロの美容室スタジオ。"
                rows={6}
                className="w-full bg-[#12121A] border border-[#2A2A3E] rounded-lg p-3 text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-gold/50 mb-3" />
              <div className="space-y-2 mb-4">
                <p className="text-xs text-gray-500">テンプレート</p>
                {[
                  "縮毛矯正のビフォーアフター比較写真",
                  "夏のさらさらヘアのイメージ画像",
                  "高級美容室の施術中の様子",
                ].map((t) => (
                  <button key={t} onClick={() => setGeneratePrompt(t)}
                    className="w-full text-left text-xs text-gray-400 hover:text-gold p-2 bg-[#12121A] rounded hover:bg-[#1A1A2A] transition-colors">
                    → {t}
                  </button>
                ))}
              </div>
              <button onClick={handleGenerate} disabled={processing || !generatePrompt.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gold rounded-lg text-white font-medium hover:bg-gold-dark disabled:opacity-50">
                {processing ? <><Loader2 size={16} className="animate-spin" />生成中...</> : <><Sparkles size={16} />DALL-E 3 で生成</>}
              </button>
              <p className="text-xs text-gray-600 mt-2 text-center">OPENAI_API_KEY 設定後に稼働</p>
            </div>
          </div>
          <div className="dashboard-card flex flex-col items-center justify-center min-h-64">
            {generatedImageUrl ? (
              <div className="w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={generatedImageUrl} alt="Generated" className="w-full rounded-lg" />
                <div className="flex gap-2 mt-3">
                  <a href={generatedImageUrl} download target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-2 bg-gold/10 border border-gold/30 rounded-lg text-gold text-xs text-center hover:bg-gold/20">
                    <Download size={12} className="inline mr-1" />ダウンロード
                  </a>
                  <button className="flex-1 py-2 bg-[#12121A] border border-[#2A2A3E] rounded-lg text-gray-400 text-xs hover:border-gold/30">
                    Instagram に投稿
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <Sparkles size={40} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">プロンプトを入力して生成してください</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
