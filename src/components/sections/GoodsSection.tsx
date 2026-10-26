import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { SectionHeading } from "@/components/ui/Editorial";
import homeStyles from "./home-sections.module.css";
import styles from "./goods-section.module.css";

export function GoodsSection() {
  return <section id="goods" className={homeStyles.section} aria-labelledby="goods-title">
    <SectionHeading index="07" title="GOODS" id="goods-title" note="OFFICIAL GOODS / VISAGE" />
    <Link href="/goods/" className={styles.gateway}>
      <div className={styles.visual} data-reveal="photo">
        <Image src="/assets/images/goods/face-towel-final.png" width={855} height={349} alt="白いVisageロゴと三日月を配した黒いフェイスタオル" sizes="(max-width: 700px) 90vw, 700px" className={styles.towel} />
        <Image src="/assets/images/goods/keychains-intact.png" width={670} height={140} alt="透明と黒のVisageアクリルキーホルダー" sizes="(max-width: 700px) 70vw, 450px" className={styles.keychains} />
      </div>
      <div className={styles.copy} data-reveal style={{ "--reveal-delay": "140ms" } as CSSProperties}>
        <p className={styles.lead}>Visageの世界を、<br />あなたの日常に。</p>
        <p className={styles.description}>ライブの記憶を、その手に。</p>
        <span className={styles.cta}><span>VIEW OFFICIAL GOODS<small>オフィシャルグッズを見る</small></span><i aria-hidden="true">↗</i></span>
      </div>
    </Link>
  </section>;
}
