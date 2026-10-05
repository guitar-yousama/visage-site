import { Hero, HomeSections } from "@/components/sections/HomeSections";
import type { Metadata } from "next";

export const metadata: Metadata = { alternates: { canonical: "https://visage-site.vercel.app/" } };

export default function HomePage() {
  return <main id="main-content"><Hero /><HomeSections /></main>;
}
