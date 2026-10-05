import type { Metadata } from "next";
import { SectionPage } from "@/components/sections/SectionPage";
import { NewsList } from "@/components/sections/ContentLists";
import { newsItems } from "@/lib/site-data";

export const metadata: Metadata = { title: "News", alternates: { canonical: "https://visage-site.vercel.app/news" } };

export default function NewsPage() {
  return <SectionPage index="04" title="NEWS" description="LATEST FROM VISAGE">
    <NewsList items={newsItems} />
  </SectionPage>;
}
