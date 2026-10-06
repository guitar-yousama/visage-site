import { NovelIntro } from "@/components/sections/NovelIntro";
import type { Metadata } from "next";
import { SectionPage } from "@/components/sections/SectionPage";
import styles from "@/components/sections/section-page.module.css";
import { profileCopy } from "@/lib/site-data";

export const metadata: Metadata = { title: "Profile", alternates: { canonical: "https://visage-site.vercel.app/profile" } };

export default function ProfilePage() {
  return <SectionPage index="05" title="PROFILE" description="MANIFESTO / WORLD VIEW">
    <div className={`${styles.copy} ${styles.manifesto}`}>
      <h2 data-reveal>{profileCopy.heading}</h2>
      <p className={styles.entityIntro}>Visage（ヴィサージュ）は、熊本を拠点に活動するヴィジュアル系バンド。美しく退廃的な世界観と、鋭く重いロックサウンドを届けます。</p>
      <NovelIntro paragraphs={profileCopy.paragraphs} className={styles.manifestoBody} emphasisClass={styles.manifestoEmphasis} closingClass={styles.manifestoClosing} />
    </div>
  </SectionPage>;
}
