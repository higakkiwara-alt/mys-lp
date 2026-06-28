import { NextRequest, NextResponse } from "next/server";
import { extractStylistInsights, generateStylistContent } from "@/lib/voice";

export async function GET() {
  const memos = [
    {
      id: "1",
      stylist: "田中スタイリスト",
      date: "2024-06-20",
      transcript: "本日のお客様は30代女性。縮毛矯正希望。以前他店で失敗した経験あり。Aujuaを使用してダメージケアしながら施術。仕上がりに大変満足。",
      insights: {
        techniques: ["縮毛矯正", "Aujuaトリートメント"],
        customerNeeds: ["ダメージケア", "前回失敗の修正"],
        products: ["Aujua"],
        followUpActions: ["1ヶ月後のホームケア確認"],
        summary: "ダメージを最小限に抑えた縮毛矯正。お客様満足度高。",
      },
      contentGenerated: true,
    },
    {
      id: "2",
      stylist: "佐藤スタイリスト",
      date: "2024-06-19",
      transcript: "カラーリストとしての技術向上のため、バレイヤージュの練習。モデルさんに協力していただき、グラデーションカラーを実施。",
      insights: {
        techniques: ["バレイヤージュ", "グラデーションカラー"],
        customerNeeds: ["トレンドスタイル"],
        products: [],
        followUpActions: ["インスタ投稿用写真撮影"],
        summary: "バレイヤージュ技術の向上。インスタ映えするスタイル完成。",
      },
      contentGenerated: false,
    },
  ];
  return NextResponse.json({ memos });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, transcript, insights } = body;

  if (action === "analyze" && transcript) {
    const result = await extractStylistInsights(transcript);
    return NextResponse.json({ insights: result });
  }

  if (action === "generate-content" && insights) {
    const content = await generateStylistContent(insights);
    return NextResponse.json({ content });
  }

  return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
}
