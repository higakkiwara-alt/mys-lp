import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP, Cormorant_Garamond } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
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
    template: "%s | Mys",
  },
  description: "立川駅南口徒歩2分。髪質改善・縮毛矯正の専門サロン。ダメージゼロで圧倒的なまとまり髪へ。",
  keywords: ["髪質改善", "縮毛矯正", "立川", "美容室", "サロン", "Mys", "ミース"],
  authors: [{ name: "Mys（ミース）立川" }],
  creator: "Mys（ミース）立川",
  metadataBase: new URL("https://mys-salon.com"),
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://mys-salon.com",
    siteName: "Mys（ミース）立川",
    title: "Mys（ミース）| 立川・髪質改善専門サロン",
    description: "立川駅南口徒歩2分。髪質改善・縮毛矯正の専門サロン。ダメージゼロで圧倒的なまとまり髪へ。",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Mys（ミース）立川" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mys（ミース）| 立川・髪質改善専門サロン",
    description: "立川駅南口徒歩2分。髪質改善・縮毛矯正の専門サロン。",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSans.variable} ${notoSerif.variable} ${cormorant.variable}`}>
      <body className="font-sans"><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
