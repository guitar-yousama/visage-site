import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { BackgroundAtmosphere } from "@/components/layout/BackgroundAtmosphere";
import { ScrollMotion } from "@/components/layout/ScrollMotion";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Visage | 熊本発ヴィジュアル系バンド", template: "%s | Visage" },
  description: "熊本を拠点に活動するヴィジュアル系バンド、Visage。ダークな世界観とヘヴィなサウンド、美しさを融合した音楽を発信。",
  openGraph: {
    title: "Visage | 熊本発ヴィジュアル系バンド",
    description: "熊本を拠点に活動するヴィジュアル系バンド、Visage。",
    siteName: "Visage",
    locale: "ja_JP",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Visage | 熊本発ヴィジュアル系バンド", description: "熊本を拠点に活動するヴィジュアル系バンド、Visage。" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body><BackgroundAtmosphere /><ScrollMotion /><a className="skip-link" href="#main-content">本文へスキップ</a><Header />{children}<Footer /></body>
    </html>
  );
}
