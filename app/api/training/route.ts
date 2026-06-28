import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/claude";

const MOCK_MATERIALS = [
  { id: "1", title: "縮毛矯正の基本技術", category: "技術", level: "beginner", views: 24, quiz: true },
  { id: "2", title: "Aujuaトリートメントの処方", category: "商材", level: "intermediate", views: 18, quiz: true },
  { id: "3", title: "カウンセリングの極意", category: "接客", level: "beginner", views: 31, quiz: false },
  { id: "4", title: "バレイヤージュ実践テクニック", category: "技術", level: "advanced", views: 12, quiz: true },
  { id: "5", title: "SNS活用・写真撮影術", category: "マーケ", level: "beginner", views: 27, quiz: false },
];

const MOCK_QA = [
  { id: "1", question: "縮毛矯正で薬が残留したらどうする？", answer: "シャンプーで残留アルカリを除去し、酸性化粧品で補正してください。", category: "技術" },
  { id: "2", question: "お客様が仕上がりに不満の場合の対応は？", answer: "まず謝罪し、お客様の具体的な不満を聞き取ります。再施術か返金かを相談し、サロン長に必ず報告してください。", category: "接客" },
  { id: "3", question: "Aujuaのプログラム選定基準は？", answer: "髪の状態（損傷度・水分量・柔軟性）と頭皮の状態（皮脂量・乾燥度）を診断し、4プログラムから最適を選びます。", category: "商材" },
];

export async function GET() {
  const stats = {
    totalMaterials: MOCK_MATERIALS.length,
    totalViews: MOCK_MATERIALS.reduce((s, m) => s + m.views, 0),
    staffCount: 6,
    avgCompletion: 72,
    topCategory: "技術",
  };
  return NextResponse.json({ materials: MOCK_MATERIALS, qa: MOCK_QA, stats });
}

export async function POST(req: NextRequest) {
  const { action, question, category, topic, level } = await req.json();

  if (action === "answer" && question) {
    const answer = await generateContent(
      question,
      `あなたはMys（ミース）立川の美容師研修AI。髪質改善・縮毛矯正・接客・マーケの専門知識で回答。300字以内。カテゴリ: ${category ?? "一般"}`
    );
    return NextResponse.json({ question, answer, category: category ?? "一般" });
  }

  if (action === "create-material" && topic) {
    const content = await generateContent(
      `美容師研修教材を作成。トピック: ${topic}。レベル: ${level ?? "beginner"}。
構成: 概要・手順・注意点・確認クイズ3問。800字以上の詳細な研修テキスト。`
    );
    const quiz = await generateContent(
      `「${topic}」の確認クイズ3問をJSON形式で作成。[{"q": "問題文", "options": ["A","B","C","D"], "answer": "A"}]`
    );
    const quizParsed = JSON.parse(quiz.match(/\[[\s\S]*\]/)?.[0] ?? "[]");
    return NextResponse.json({ title: topic, content, quiz: quizParsed, level: level ?? "beginner" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
