import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans",
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const notoSerif = Noto_Serif_JP({
  subsets: ["latin"],
  variable: "--font-noto-serif",
  weight: ["300", "400", "700"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["300", "400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Mys（ミース）| 立川・髪質改善専門サロン",
    template: "%s | Mys AI Salon OS",
  },
  description: "立川駅南口徒歩2分。髪質改善・縮毛矯正の専門サロン。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSans.variable} ${notoSerif.variable} ${cormorant.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
