import { Hero, HomeSections } from "@/components/sections/HomeSections";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Visage（ヴィサージュ）｜熊本ヴィジュアル系バンド オフィシャルサイト" },
  description: "熊本を拠点に活動するヴィジュアル系バンド「Visage（ヴィサージュ）」のオフィシャルサイト。ライブ情報、メンバー、楽曲、最新ニュースなどVisageの最新情報を発信。",
  alternates: { canonical: "https://visage-site.vercel.app/" },
  openGraph: {
    title: "Visage（ヴィサージュ）｜熊本ヴィジュアル系バンド",
    description: "熊本を拠点に活動するヴィジュアル系バンド「Visage」のオフィシャルサイト。",
    url: "https://visage-site.vercel.app/",
    siteName: "Visage Official Website",
    locale: "ja_JP",
    type: "website",
    images: [{ url: "/assets/images/hero/hero_02.webp", width: 1920, height: 1080, alt: "熊本を拠点に活動するヴィジュアル系ロックバンド Visage" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Visage（ヴィサージュ）｜熊本ヴィジュアル系バンド",
    description: "熊本を拠点に活動するヴィジュアル系バンド「Visage」のオフィシャルサイト。",
    images: ["/assets/images/hero/hero_02.webp"],
  },
};

export default function HomePage() {
  return <main id="main-content"><Hero /><HomeSections /></main>;
}
