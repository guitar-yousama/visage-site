import type { Metadata } from "next";
import { SectionPage } from "@/components/sections/SectionPage";
import { ReleaseList } from "@/components/sections/ContentLists";
import { releases } from "@/lib/site-data";

export const metadata: Metadata = { title: "Music" };

export default function MusicPage() {
  return <SectionPage index="01" title="MUSIC" description="DARKNESS. HEAVY SOUND. BEAUTIFUL DECAY.">
    <ReleaseList releases={releases} />
  </SectionPage>;
}
