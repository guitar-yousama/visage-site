import type { Metadata } from "next";
import { SectionPage } from "@/components/sections/SectionPage";
import { NewsList } from "@/components/sections/ContentLists";
import { liveEvents, newsItems } from "@/lib/site-data";

export const metadata: Metadata = { title: "News", alternates: { canonical: "https://visage-site.vercel.app/news" } };

export default function NewsPage() {
  const eclipse = liveEvents.find(event => event.slug === "visage-vs-gheme-eclipse" && !event.archived);
  const items = eclipse ? [{ slug: eclipse.slug, date: eclipse.date, dateLabel: eclipse.dateLabel, category: "LIVE", title: eclipse.eventName, body: eclipse.description ?? "", href: "/live" }, ...newsItems] : newsItems;
  return <SectionPage index="04" title="NEWS" description="LATEST FROM VISAGE">
    <NewsList items={items} />
  </SectionPage>;
}
