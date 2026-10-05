import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { BackgroundAtmosphere } from "@/components/layout/BackgroundAtmosphere";
import { ScrollMotion } from "@/components/layout/ScrollMotion";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://visage-site.vercel.app"),
  verification: { google: "JWMwVpG_vKqMVTxAcw61xACIN1V5_4ljvB0zD_hk2dA" },
  title: { default: "Visage Official Website | 熊本・九州のヴィジュアル系ロックバンド", template: "%s | Visage" },
  description: "熊本・九州を拠点に活動するヴィジュアル系ロックバンド「Visage」公式サイト。楽曲、ライブ情報、メンバー、映像、NEWSなど最新情報を発信。美しく退廃的で、どこか危険な世界観と鋭く重いロックサウンドを展開する。",
  openGraph: {
    title: "Visage Official Website | 熊本・九州のヴィジュアル系ロックバンド",
    description: "熊本・九州を拠点に活動するヴィジュアル系ロックバンド「Visage」公式サイト。",
    siteName: "Visage Official Website",
    url: "https://visage-site.vercel.app/",
    images: [{ url: "/assets/images/hero/hero_02.webp", width: 1920, height: 1080, alt: "熊本を拠点に活動するヴィジュアル系ロックバンド Visage" }],
    locale: "ja_JP",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Visage Official Website | 熊本・九州のヴィジュアル系ロックバンド", description: "熊本・九州を拠点に活動するヴィジュアル系ロックバンド「Visage」公式サイト。", images: ["/assets/images/hero/hero_02.webp"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body><BackgroundAtmosphere /><ScrollMotion /><a className="skip-link" href="#main-content">本文へスキップ</a><Header />{children}<Footer /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": [{ "@type": "MusicGroup", "@id": "https://visage-site.vercel.app/#visage", name: "Visage", url: "https://visage-site.vercel.app/", description: "熊本・九州を拠点に活動する日本のヴィジュアル系ロックバンドVisage。", logo: "https://visage-site.vercel.app/assets/images/hero/visage_wh.png", image: "https://visage-site.vercel.app/assets/images/hero/hero_02.webp", genre: ["Visual Kei", "Rock"], sameAs: ["https://www.instagram.com/re_visage2025/", "https://x.com/Re_Visage", "https://www.tiktok.com/@visage7444", "https://www.youtube.com/@Visage-b9g"] }, { "@type": "WebSite", "@id": "https://visage-site.vercel.app/#website", name: "Visage Official Website", url: "https://visage-site.vercel.app/", description: "熊本・九州のヴィジュアル系ロックバンドVisage公式サイト。", publisher: { "@id": "https://visage-site.vercel.app/#visage" } }] }) }} /></body>
    </html>
  );
}
