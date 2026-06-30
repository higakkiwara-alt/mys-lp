import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthFromRequest } from "@/lib/auth";
import { buildSafePrompt } from "@/lib/ai-security";

const applicantSchema = z.object({
  name: z.string().min(1).max(100),
  age: z.number().int().min(18).max(60),
  school: z.string().max(200).optional(),
  message: z.string().min(1).max(500),
  experience: z.string().max(500).optional(),
});

const contentSchema = z.object({
  type: z.enum(["lp", "instagram", "tiktok", "line", "job-description"]),
  details: z.record(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const authErr = requireAuthFromRequest(req);
  if (authErr) return authErr;

  return NextResponse.json({
    applicants: [],
    stats: { total: 8, screening: 3, interview: 2, hired: 1, rejected: 2 },
  });
}

export async function POST(req: NextRequest) {
  const authErr = requireAuthFromRequest(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();

    if (body.type) {
      const { type, details } = contentSchema.parse(body);
      const { generateContent } = await import("@/lib/claude");

      const prompts: Record<string, string> = {
        instagram: `Mys（ミース）立川・髪質改善専門サロンの求人Instagram投稿を作成。絵文字あり、ハッシュタグ付き、500文字以内。働く環境・成長機会・待遇を訴求。`,
        tiktok: `Mys（ミース）の求人TikTok動画台本（30〜60秒）を作成。「1日密着」形式で、スタッフの一日を見せる構成。字幕テキストも含む。`,
        line: `Mys（ミース）のLINE公式アカウントから送る求人募集メッセージ。簡潔で親しみやすく、応募方法を明記。`,
        lp: `Mys（ミース）の求人ランディングページのコピーを作成。キャッチコピー・働く環境・給与・求めるスタッフ像・応募フォームの各セクションのテキスト。`,
        "job-description": `Mys（ミース）のスタイリスト/アシスタント求人票を作成。職種・仕事内容・給与・待遇・勤務時間・必要スキルを含む。`,
      };

      const content = await generateContent(prompts[type] ?? prompts.instagram);
      return NextResponse.json({ type, content });
    }

    const applicant = applicantSchema.parse(body);
    const { generateContent } = await import("@/lib/claude");

    // Applicant fields (name, message, experience) are user-controlled — use safe prompt builder
    const userContent = [
      `応募者: ${applicant.name}（${applicant.age}歳）`,
      `学校: ${applicant.school ?? "不明"}`,
      `志望動機: ${applicant.message}`,
      `経験: ${applicant.experience ?? "なし"}`,
    ].join("\n");

    const evalPrompt = buildSafePrompt(
      `以下の美容師応募者を採用担当として評価してください。以下のJSON形式で返してください:\n{"score":0-100,"aptitude":{"creativity":0-100,"service":0-100,"teamwork":0-100,"growth":0-100},"strengths":["強み1"],"concerns":["懸念点1"],"recommendation":"強く推奨|推奨|要検討|不推奨","interviewQuestions":["質問1","質問2","質問3"]}`,
      userContent,
      "JSONのみ返してください。"
    );

    const result = await generateContent(evalPrompt);
    const match = result.match(/\{[\s\S]*\}/);
    const evaluation = match ? JSON.parse(match[0]) : null;

    return NextResponse.json({ applicant, evaluation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("[recruit/route]", error);
    return NextResponse.json({ error: "Failed to process" }, { status: 500 });
  }
}
