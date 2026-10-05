import type { Metadata } from "next";
import { SectionPage } from "@/components/sections/SectionPage";
import { LiveList } from "@/components/sections/ContentLists";
import { liveEvents } from "@/lib/site-data";

export const metadata: Metadata = { title: "Live", alternates: { canonical: "https://visage-site.vercel.app/live" } };

export default function LivePage() {
  return <SectionPage index="02" title="LIVE" description="RAW / PRESENT / HERE">
    <LiveList events={liveEvents} />
  </SectionPage>;
}
