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
      <p className={styles.entityIntro}>Visageは、熊本・九州を拠点に活動する日本のヴィジュアル系ロックバンドです。</p>
      <NovelIntro paragraphs={profileCopy.paragraphs} className={styles.manifestoBody} emphasisClass={styles.manifestoEmphasis} closingClass={styles.manifestoClosing} />
    </div>
  </SectionPage>;
}
