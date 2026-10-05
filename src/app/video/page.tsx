import type { Metadata } from "next";
import { SectionPage } from "@/components/sections/SectionPage";
import { VideoList } from "@/components/sections/ContentLists";
import { videos } from "@/lib/site-data";

export const metadata: Metadata = { title: "Video", alternates: { canonical: "https://visage-site.vercel.app/video" } };

export default function VideoPage() {
  return <SectionPage index="03" title="VIDEO" description="IMAGE / SOUND / MOTION">
    <VideoList videos={videos} />
  </SectionPage>;
}
