import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/claude";

const MOCK_CLIENTS = [
  { id: "1", salonName: "Hair Studio Luna", ownerName: "中村 美佳", plan: "standard", mrr: 29800, status: "active", startDate: "2024-01-15", features: ["content-hub", "meo", "seo"] },
  { id: "2", salonName: "Beleza 新宿", ownerName: "高橋 正樹", plan: "pro", mrr: 49800, status: "active", startDate: "2024-02-01", features: ["content-hub", "meo", "seo", "retention", "image-studio"] },
  { id: "3", salonName: "ヘアルーム 横浜", ownerName: "山本 裕子", plan: "starter", mrr: 9800, status: "trial", startDate: "2024-06-01", features: ["content-hub"] },
  { id: "4", salonName: "Salon de Vie 渋谷", ownerName: "伊藤 健", plan: "pro", mrr: 49800, status: "active", startDate: "2024-03-10", features: ["content-hub", "meo", "seo", "retention", "image-studio", "sales-closer"] },
];

const PLANS = [
  { id: "starter", name: "Starter", price: 9800, features: ["コンテンツハブ（月10件）", "MEO管理", "レポート"] },
  { id: "standard", name: "Standard", price: 29800, features: ["コンテンツハブ（無制限）", "MEO管理", "SEO記事（月4件）", "画像スタジオ", "顧客分析"] },
  { id: "pro", name: "Pro", price: 49800, features: ["全機能解放", "AIセールスクローザー", "競合分析", "リテンション AI", "専任サポート"] },
];

export async function GET() {
  const totalMrr = MOCK_CLIENTS.filter((c) => c.status === "active").reduce((s, c) => s + c.mrr, 0);
  const arr = totalMrr * 12;
  const stats = {
    totalClients: MOCK_CLIENTS.length,
    activeClients: MOCK_CLIENTS.filter((c) => c.status === "active").length,
    trialClients: MOCK_CLIENTS.filter((c) => c.status === "trial").length,
    mrr: totalMrr,
    arr,
    avgMrr: Math.round(totalMrr / MOCK_CLIENTS.filter((c) => c.status === "active").length),
    churnRate: 2.1,
    nps: 71,
  };
  const mrrHistory = [
    { month: "1月", mrr: 39600 },
    { month: "2月", mrr: 89400 },
    { month: "3月", mrr: 139200 },
    { month: "4月", mrr: 139200 },
    { month: "5月", mrr: 139200 },
    { month: "6月", mrr: 139200 },
  ];
  return NextResponse.json({ clients: MOCK_CLIENTS, stats, plans: PLANS, mrrHistory });
}

export async function POST(req: NextRequest) {
  const { action, client } = await req.json();

  if (action === "onboard" && client) {
    const welcomeMessage = await generateContent(
      `SaaSオンボーディングウェルカムメール作成。美容室AI自動化SaaS「Mys AI OS」。
新規クライアント: ${client.salonName}（${client.plan}プラン）。
最初の1週間でやるべきセットアップ手順と期待できる成果を含む、300字以内の日本語メール本文。`
    );
    return NextResponse.json({ welcomeMessage, client });
  }

  if (action === "proposal" && client) {
    const proposal = await generateContent(
      `美容室SaaS提案書サマリー。対象: ${client.salonName}。現プラン: ${client.plan}。
アップグレード提案と想定ROIを含む200字以内のビジネス提案。`
    );
    return NextResponse.json({ proposal });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
