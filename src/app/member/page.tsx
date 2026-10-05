import type { Metadata } from "next";
import { SectionPage } from "@/components/sections/SectionPage";
import { MemberPortraits } from "@/components/sections/MemberPortraits";

export const metadata: Metadata = { title: "Member", alternates: { canonical: "https://visage-site.vercel.app/member" } };

export default function MemberPage() {
  return <SectionPage index="06" title="MEMBER" description="FIVE VOICES / ONE VISAGE">
    <MemberPortraits />
  </SectionPage>;
}
