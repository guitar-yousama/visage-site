import type { Metadata } from "next";
import { SectionPage } from "@/components/sections/SectionPage";
import styles from "@/components/sections/section-page.module.css";
import { profileCopy } from "@/lib/site-data";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return <SectionPage index="05" title="PROFILE" description="MANIFESTO / WORLD VIEW">
    <div className={`${styles.copy} ${styles.manifesto}`}>
      <h2 data-reveal>{profileCopy.heading}</h2>
      <div className={styles.manifestoBody}>
        {profileCopy.paragraphs.map((paragraph, index) => <p key={paragraph} className={index === 1 || index === 2 ? styles.manifestoEmphasis : index === 4 ? styles.manifestoClosing : undefined} data-reveal style={{ "--reveal-delay": `${Math.min(index, 3) * 110}ms` } as React.CSSProperties}>{paragraph}</p>)}
      </div>
    </div>
  </SectionPage>;
}
